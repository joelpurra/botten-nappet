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

import perUserHandlersMain from "./per-user-handlers-main";
import backendTwitchIrcAuthenticatedApplicationApi from "./twitch-irc-authenticated-application-api";
import backendTwitchPollingAuthenticatedApplicationApi from "./twitch-polling-authenticated-application-api";
import backendTwitchPubSubAuthenticatedApplicationApi from "./twitch-pubsub-authenticated-application-api";

/* tslint:enable:max-line-length */

export default async function backendAuthenticatedApplicationMain(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchApplicationTokenManager: TwitchApplicationTokenManager,
    twitchRequestHelper: TwitchRequestHelper,
    twitchCSRFHelper: TwitchCSRFHelper,
    twitchTokenHelper: TwitchTokenHelper,
): Promise<void> {
    const authenticatedApplicationMainLogger = rootLogger.child("backendAuthenticatedApplicationMain");

    const twitchApplicationAccessTokenProvider: ApplicationAccessTokenProviderType =
        async () => twitchApplicationTokenManager.getOrWait();

    // TODO: find usage for the TwitchUserHelper.
    const twitchUserHelper = new TwitchUserHelper(
        rootLogger,
        twitchRequestHelper,
        config.twitchUsersDataUri,
        twitchApplicationAccessTokenProvider,
    );

    const userStorageManager = new UserStorageManager(rootLogger, UserRepository);

    const twitchUserTokenHelper = new TwitchUserTokenHelper(
        rootLogger,
        twitchCSRFHelper,
        userStorageManager,
        twitchRequestHelper,
        config.twitchOAuthAuthorizationUri,
        config.twitchAppOAuthRedirectUrl,
        config.twitchOAuthTokenUri,
        config.twitchAppClientId,
        config.twitchAppClientSecret,
    );
    const userTokenManager = new TwitchUserTokenManager(rootLogger, twitchTokenHelper, twitchUserTokenHelper);
    const twitchAugmentedTokenProvider: AugmentedTokenProviderType =
        async () => userTokenManager.get(config.twitchUserName);
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
    const twitchUserId = await twitchTokenHelper.getUserIdByRawAccessToken(twitchUserRawToken!);

    // TODO: configurable.
    const topicsStringSeparator = ":";
    const splitTopics = (topicsString: string): string[] => topicsString.split(topicsStringSeparator);

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingPubSubEvent>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingPubSubEvent),
        );

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingIrcCommand),
        );
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingFollowingEvent>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingFollowingEvent),
        );
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingStreamingEvent>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingStreamingEvent),
        );
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheermotesEvent>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingCheermotesEvent),
        );
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheeringEvent>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingCheeringEvent),
        );
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingWhisperEvent>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingWhisperEvent),
        );
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSubscriptionEvent>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingSubscriptionEvent),
        );

    const vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSearchResultEvent>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicVidyIncomingSearchResultEvent),
        );

    const connectables: IConnectable[] = [
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent,
        vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent,
    ];

    await Bluebird.map(connectables, async (connectable) => connectable.connect());

    authenticatedApplicationMainLogger.info("Connected.");

    const disconnect = async (incomingError?: Error) => {
        await Bluebird.map(connectables, async (connectable) => {
            try {
                connectable.disconnect();
            } catch (error) {
                authenticatedApplicationMainLogger.error(error, connectable, "Swallowed error while disconnecting.");
            }
        });

        if (incomingError) {
            authenticatedApplicationMainLogger.error(incomingError, "Disconnected.");

            throw incomingError;
        }

        authenticatedApplicationMainLogger.info("Disconnected.");

        return undefined;
    };

    try {
        await Promise.all([
            backendTwitchPubSubAuthenticatedApplicationApi(
                config,
                rootLogger,
                gracefulShutdownManager,
                messageQueuePublisher,
                twitchUserAccessTokenProvider,
                twitchUserId,
            ),

            backendTwitchIrcAuthenticatedApplicationApi(
                config,
                rootLogger,
                gracefulShutdownManager,
                messageQueuePublisher,
                twitchUserAccessTokenProvider,
                twitchUserId,
            ),

            backendTwitchPollingAuthenticatedApplicationApi(
                config,
                rootLogger,
                gracefulShutdownManager,
                messageQueuePublisher,
                twitchUserId,
            ),

            perUserHandlersMain(
                config,
                rootLogger,
                gracefulShutdownManager,
                messageQueuePublisher,
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
            ),
        ]);

        await disconnect();
    } catch (error) {
        disconnect(error);
    }
}
