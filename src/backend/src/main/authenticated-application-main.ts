/*
This file is part of botten-nappet -- a Twitch bot and streaming tool.
<https://joelpurra.com/projects/botten-nappet/>

Copyright (c) 2018 Joel Purra <https://joelpurra.com/>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import Bluebird from "bluebird";

import IConnectable from "@botten-nappet/shared/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

/* tslint:disable:max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/message-queue/single-item-topics-subscriber";

import TwitchApplicationTokenManager from "@botten-nappet/backend-twitch/authentication/application-token-manager";
import {
    ApplicationAccessTokenProviderType,
    AugmentedTokenProviderType,
    UserAccessTokenProviderType,
} from "@botten-nappet/backend-twitch/authentication/provider-types";
import TwitchUserTokenManager from "@botten-nappet/backend-twitch/authentication/user-token-manager";

import TwitchCSRFHelper from "@botten-nappet/backend-twitch/helper/csrf-helper";
import TwitchRequestHelper from "@botten-nappet/backend-twitch/helper/request-helper";
import TwitchTokenHelper from "@botten-nappet/backend-twitch/helper/token-helper";
import TwitchUserHelper from "@botten-nappet/backend-twitch/helper/user-helper";
import TwitchUserTokenHelper from "@botten-nappet/backend-twitch/helper/user-token-helper";

import ITwitchIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/iincoming-irc-command";

import IIncomingCheeringEvent from "@botten-nappet/interface-twitch/event/iincoming-cheering-event";
import IIncomingCheermotesEvent from "@botten-nappet/interface-twitch/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "@botten-nappet/interface-twitch/event/iincoming-following-event";
import IIncomingStreamingEvent from "@botten-nappet/interface-twitch/event/iincoming-streaming-event";
import IIncomingSubscriptionEvent from "@botten-nappet/interface-twitch/event/iincoming-subscription-event";
import IIncomingWhisperEvent from "@botten-nappet/interface-twitch/event/iincoming-whisper-event";

import IIncomingPubSubEvent from "@botten-nappet/backend-twitch/pubsub/interface/iincoming-pubsub-event";

import IIncomingSearchResultEvent from "@botten-nappet/interface-vidy/command/iincoming-search-result-event";

import UserStorageManager from "../storage/manager/user-storage-manager";
import UserRepository from "../storage/repository/user-repository";

import PerUserHandlersMain from "./per-user-handlers-main";
import BackendTwitchIrcAuthenticatedApplicationApi from "./twitch-irc-authenticated-application-api";
import BackendTwitchPollingAuthenticatedApplicationApi from "./twitch-polling-authenticated-application-api";
import BackendTwitchPubSubAuthenticatedApplicationApi from "./twitch-pubsub-authenticated-application-api";

/* tslint:enable:max-line-length */

export default class BackendAuthenticatedApplicationMain implements IStartableStoppable {
    private perUserHandlersMain: PerUserHandlersMain | null;
    private backendTwitchPollingAuthenticatedApplicationApi: BackendTwitchPollingAuthenticatedApplicationApi | null;
    private backendTwitchIrcAuthenticatedApplicationApi: BackendTwitchIrcAuthenticatedApplicationApi | null;
    private backendTwitchPubSubAuthenticatedApplicationApi: BackendTwitchPubSubAuthenticatedApplicationApi | null;
    private connectables: IConnectable[];
    private twitchTokenHelper: TwitchTokenHelper;
    private twitchCSRFHelper: TwitchCSRFHelper;
    private twitchRequestHelper: TwitchRequestHelper;
    private twitchApplicationTokenManager: TwitchApplicationTokenManager;
    private messageQueuePublisher: MessageQueuePublisher;
    private gracefulShutdownManager: GracefulShutdownManager;
    private logger: PinoLogger;
    private config: Config;

    constructor(
        config: Config,
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        messageQueuePublisher: MessageQueuePublisher,
        twitchApplicationTokenManager: TwitchApplicationTokenManager,
        twitchRequestHelper: TwitchRequestHelper,
        twitchCSRFHelper: TwitchCSRFHelper,
        twitchTokenHelper: TwitchTokenHelper,
    ) {
        this.config = config;
        this.logger = logger.child("BackendAuthenticatedApplicationMain");
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.messageQueuePublisher = messageQueuePublisher;
        this.twitchApplicationTokenManager = twitchApplicationTokenManager;
        this.twitchRequestHelper = twitchRequestHelper;
        this.twitchCSRFHelper = twitchCSRFHelper;
        this.twitchTokenHelper = twitchTokenHelper;

        this.backendTwitchPubSubAuthenticatedApplicationApi = null;
        this.backendTwitchIrcAuthenticatedApplicationApi = null;
        this.backendTwitchPollingAuthenticatedApplicationApi = null;
        this.perUserHandlersMain = null;
        this.connectables = [];
    }

    public async start(): Promise<void> {
        const twitchApplicationAccessTokenProvider: ApplicationAccessTokenProviderType =
            async () => this.twitchApplicationTokenManager.getOrWait();

        // TODO: find usage for the TwitchUserHelper.
        const twitchUserHelper = new TwitchUserHelper(
            this.logger,
            this.twitchRequestHelper,
            this.config.twitchUsersDataUri,
            twitchApplicationAccessTokenProvider,
        );

        const userStorageManager = new UserStorageManager(this.logger, UserRepository);

        const twitchUserTokenHelper = new TwitchUserTokenHelper(
            this.logger,
            this.twitchCSRFHelper,
            userStorageManager,
            this.twitchRequestHelper,
            this.config.twitchOAuthAuthorizationUri,
            this.config.twitchAppOAuthRedirectUrl,
            this.config.twitchOAuthTokenUri,
            this.config.twitchAppClientId,
            this.config.twitchAppClientSecret,
        );
        const userTokenManager = new TwitchUserTokenManager(this.logger, this.twitchTokenHelper, twitchUserTokenHelper);
        const twitchAugmentedTokenProvider: AugmentedTokenProviderType =
            async () => userTokenManager.get(this.config.twitchUserName);
        const twitchUserAccessTokenProvider: UserAccessTokenProviderType = async () => {
            const augmentedToken = await twitchAugmentedTokenProvider();

            // TODO: better null handling.
            if (augmentedToken.token === null) {
                throw new Error("augmentedToken.token is null.");
            }

            return augmentedToken.token.access_token;
        };
        const twitchAugmentedToken = await twitchAugmentedTokenProvider();
        const twitchUserRawToken = twitchAugmentedToken.token;
        // TODO: better null handling.
        const twitchUserId = await this.twitchTokenHelper.getUserIdByRawAccessToken(twitchUserRawToken!);

        // TODO: configurable.
        const topicsStringSeparator = ":";
        const splitTopics = (topicsString: string): string[] => topicsString.split(topicsStringSeparator);

        const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent =
            new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingPubSubEvent>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchIncomingPubSubEvent),
            );

        const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand =
            new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchIncomingIrcCommand),
            );
        const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent =
            new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingFollowingEvent>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchIncomingFollowingEvent),
            );
        const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent =
            new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingStreamingEvent>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchIncomingStreamingEvent),
            );
        const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent =
            new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheermotesEvent>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchIncomingCheermotesEvent),
            );
        const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent =
            new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheeringEvent>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchIncomingCheeringEvent),
            );
        const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent =
            new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingWhisperEvent>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchIncomingWhisperEvent),
            );
        const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent =
            new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSubscriptionEvent>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchIncomingSubscriptionEvent),
            );

        const vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent =
            new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSearchResultEvent>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicVidyIncomingSearchResultEvent),
            );

        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent);
        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand);
        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent);
        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent);
        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent);
        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent);
        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent);
        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent);
        this.connectables.push(vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        const disconnect = async (incomingError?: Error) => {
            await this.stop();

            if (incomingError) {
                this.logger.error(incomingError, "Disconnected.");

                throw incomingError;
            }

            this.logger.info("Disconnected.");

            return undefined;
        };

        this.backendTwitchPubSubAuthenticatedApplicationApi = new BackendTwitchPubSubAuthenticatedApplicationApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchUserAccessTokenProvider,
            twitchUserId,
        );

        this.backendTwitchIrcAuthenticatedApplicationApi = new BackendTwitchIrcAuthenticatedApplicationApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchUserAccessTokenProvider,
            twitchUserId,
        );

        this.backendTwitchPollingAuthenticatedApplicationApi = new BackendTwitchPollingAuthenticatedApplicationApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchUserId,
        );

        this.perUserHandlersMain = new PerUserHandlersMain(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent,
            vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent,
            twitchUserId,
        );

        try {
            await Promise.all([
                this.backendTwitchPubSubAuthenticatedApplicationApi.start(),
                this.backendTwitchIrcAuthenticatedApplicationApi.start(),
                this.backendTwitchPollingAuthenticatedApplicationApi.start(),
                this.perUserHandlersMain.start(),
            ]);

            await disconnect();
        } catch (error) {
            await disconnect(error);
        }
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        this.backendTwitchPubSubAuthenticatedApplicationApi!.stop();
        this.backendTwitchIrcAuthenticatedApplicationApi!.stop();
        this.backendTwitchPollingAuthenticatedApplicationApi!.stop();
        this.perUserHandlersMain!.stop();

        await Bluebird.map(
            this.connectables,
            async (connectable) => {
                try {
                    await connectable.disconnect();
                } catch (error) {
                    this.logger
                        .error(error, connectable, "Swallowed error while disconnecting.");
                }
            },
        );
    }
}
