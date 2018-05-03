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

import {
    autoinject,
} from "aurelia-framework";
import Bluebird from "bluebird";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";
import SharedTopicsConfig from "@botten-nappet/shared/src/config/shared-topics-config";
import ZmqConfig from "@botten-nappet/shared/src/config/zmq-config";

import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/src/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/src/message-queue/single-item-topics-subscriber";
import MessageQueueTopicHelper from "@botten-nappet/shared/src/message-queue/topics-splitter";

import TwitchApplicationTokenManager from "@botten-nappet/backend-twitch/src/authentication/application-token-manager";
import {
    ApplicationAccessTokenProviderType,
    AugmentedTokenProviderType,
    UserAccessTokenProviderType,
    UserIdProviderType,
} from "@botten-nappet/backend-twitch/src/authentication/provider-types";
import TwitchUserTokenManager from "@botten-nappet/backend-twitch/src/authentication/user-token-manager";

import TwitchCSRFHelper from "@botten-nappet/backend-twitch/src/helper/csrf-helper";
import TwitchRequestHelper from "@botten-nappet/backend-twitch/src/helper/request-helper";
import TwitchTokenHelper from "@botten-nappet/backend-twitch/src/helper/token-helper";
import TwitchUserHelper from "@botten-nappet/backend-twitch/src/helper/user-helper";
import TwitchUserTokenHelper from "@botten-nappet/backend-twitch/src/helper/user-token-helper";

import ITwitchIncomingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/iincoming-irc-command";

import IIncomingSearchResultEvent from "@botten-nappet/interface-shared-vidy/src/event/iincoming-search-result-event";

import UserStorageManager from "@botten-nappet/backend-shared/src/storage/manager/user-storage-manager";
import UserRepository from "@botten-nappet/backend-shared/src/storage/repository/user-repository";

import BackendTwitchIrcAuthenticatedApplicationApi from "@botten-nappet/server-twitch/src/irc-authenticated-application-api";
import BackendTwitchPollingAuthenticatedApplicationApi from "@botten-nappet/server-twitch/src/polling-authenticated-application-api";
import BackendTwitchPubSubAuthenticatedApplicationApi from "@botten-nappet/server-twitch/src/pubsub-authenticated-application-api";

import IncomingCheeringEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-cheering-event-single-item-json-topics-subscriber";
import IncomingCheermotesEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-cheermotes-event-single-item-json-topics-subscriber";
import IncomingFollowingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-following-event-single-item-json-topics-subscriber";
import IncomingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-irc-command-single-item-json-topics-subscriber";
import IncomingPubSubEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-pub-sub-event-single-item-json-topics-subscriber";
import IncomingSearchResultEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-search-result-event-single-item-json-topics-subscriber";
import IncomingStreamingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-streaming-event-single-item-json-topics-subscriber";
import IncomingSubscriptionEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-subscription-event-single-item-json-topics-subscriber";
import IncomingWhisperEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-whisper-event-single-item-json-topics-subscriber";

import PerUserHandlersMain from "./per-user-handlers-main";

/* tslint:enable:max-line-length */

@autoinject
export default class BackendAuthenticatedApplicationMain implements IStartableStoppable {
    private perUserHandlersMain: PerUserHandlersMain | null;
    private backendTwitchPollingAuthenticatedApplicationApi: BackendTwitchPollingAuthenticatedApplicationApi | null;
    private backendTwitchIrcAuthenticatedApplicationApi: BackendTwitchIrcAuthenticatedApplicationApi | null;
    private backendTwitchPubSubAuthenticatedApplicationApi: BackendTwitchPubSubAuthenticatedApplicationApi | null;
    private connectables: IConnectable[];
    private logger: PinoLogger;

    constructor(
        private readonly backendConfig: BackendConfig,
        private readonly sharedTopicsConfig: SharedTopicsConfig,
        private readonly zmqConfig: ZmqConfig,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private readonly messageQueueTopicHelper: MessageQueueTopicHelper,
        private readonly twitchApplicationTokenManager: TwitchApplicationTokenManager,
        private readonly twitchRequestHelper: TwitchRequestHelper,
        private readonly twitchCSRFHelper: TwitchCSRFHelper,
        private readonly twitchTokenHelper: TwitchTokenHelper,
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent:
            IncomingPubSubEventSingleItemJsonTopicsSubscriber,
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
            IncomingIrcCommandSingleItemJsonTopicsSubscriber,
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent:
            IncomingFollowingEventSingleItemJsonTopicsSubscriber,
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent:
            IncomingStreamingEventSingleItemJsonTopicsSubscriber,
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent:
            IncomingCheermotesEventSingleItemJsonTopicsSubscriber,
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent:
            IncomingCheeringEventSingleItemJsonTopicsSubscriber,
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent:
            IncomingWhisperEventSingleItemJsonTopicsSubscriber,
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent:
            IncomingSubscriptionEventSingleItemJsonTopicsSubscriber,
        private readonly vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent:
            IncomingSearchResultEventSingleItemJsonTopicsSubscriber,
    ) {
        this.logger = logger.child(this.constructor.name);

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
            this.backendConfig.twitchUsersDataUri,
            twitchApplicationAccessTokenProvider,
        );

        const userStorageManager = new UserStorageManager(this.logger, UserRepository);

        const twitchUserTokenHelper = new TwitchUserTokenHelper(
            this.logger,
            this.twitchCSRFHelper,
            userStorageManager,
            this.twitchRequestHelper,
            this.backendConfig.twitchOAuthAuthorizationUri,
            this.backendConfig.twitchAppOAuthRedirectUrl,
            this.backendConfig.twitchOAuthTokenUri,
            this.backendConfig.twitchAppClientId,
            this.backendConfig.twitchAppClientSecret,
        );

        const userTokenManager = new TwitchUserTokenManager(this.logger, this.twitchTokenHelper, twitchUserTokenHelper);

        const twitchAugmentedTokenProvider: AugmentedTokenProviderType =
            async () => userTokenManager.get(this.backendConfig.twitchUserName);

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
        const twitchUserIdProvider: UserIdProviderType = () => Promise.resolve(twitchUserId);

        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent);
        this.connectables.push(this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        this.backendTwitchPubSubAuthenticatedApplicationApi = new BackendTwitchPubSubAuthenticatedApplicationApi(
            this.backendConfig,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchUserAccessTokenProvider,
            twitchUserId,
        );

        this.backendTwitchIrcAuthenticatedApplicationApi = new BackendTwitchIrcAuthenticatedApplicationApi(
            this.backendConfig,
            this.zmqConfig,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            this.messageQueueTopicHelper,
            twitchUserAccessTokenProvider,
            twitchUserId,
        );

        this.backendTwitchPollingAuthenticatedApplicationApi = new BackendTwitchPollingAuthenticatedApplicationApi(
            this.backendConfig,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchUserId,
        );

        this.perUserHandlersMain = new PerUserHandlersMain(
            this.backendConfig,
            this.sharedTopicsConfig,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent,
            this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent,
            twitchUserId,
        );

        await Promise.all([
            this.backendTwitchPubSubAuthenticatedApplicationApi.start(),
            this.backendTwitchIrcAuthenticatedApplicationApi.start(),
            this.backendTwitchPollingAuthenticatedApplicationApi.start(),
            this.perUserHandlersMain.start(),
        ]);
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.backendTwitchPubSubAuthenticatedApplicationApi) {
            this.backendTwitchPubSubAuthenticatedApplicationApi.stop();
        }

        if (this.backendTwitchIrcAuthenticatedApplicationApi) {
            this.backendTwitchIrcAuthenticatedApplicationApi.stop();
        }

        if (this.backendTwitchPollingAuthenticatedApplicationApi) {
            this.backendTwitchPollingAuthenticatedApplicationApi.stop();
        }

        if (this.perUserHandlersMain) {
            this.perUserHandlersMain.stop();
        }

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
