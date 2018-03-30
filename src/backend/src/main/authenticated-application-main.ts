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

import UserStorageManager from "../storage/manager/user-storage-manager";
import UserRepository from "../storage/repository/user-repository";

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
/* tslint:disable:max-line-length */
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/message-queue/single-item-topics-subscriber";
/* tslint:enable:max-line-length */

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

import ITwitchIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/command/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/command/ioutgoing-irc-command";
import TwitchIrcConnection from "@botten-nappet/backend-twitch/irc/irc-connection";

import PollingClientIdConnection from "@botten-nappet/backend-twitch/polling/connection/polling-clientid-connection";

import IIncomingCheeringEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-cheering-event";
import IIncomingCheermotesEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-following-event";
import IIncomingPubSubEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-pubsub-event";
import IIncomingStreamingEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-streaming-event";
import IIncomingSubscriptionEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-subscription-event";
import IIncomingWhisperEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-whisper-event";
import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/polling/handler/icheermotes-polling-response";
import IPollingFollowingResponse from "@botten-nappet/backend-twitch/polling/handler/ifollowing-polling-response";
import IPollingStreamingResponse from "@botten-nappet/backend-twitch/polling/handler/istreaming-polling-response";

import IIncomingSearchResultEvent from "@botten-nappet/backend-vidy/command/iincoming-search-result-event";
import IOutgoingSearchCommand from "@botten-nappet/backend-vidy/command/ioutgoing-search-command";

import perUserHandlersMain from "./per-user-handlers-main";
import backendTwitchPubSubAuthenticatedApplicationApi from "./twitch-pubsub-authenticated-application-api";

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

    // TODO: externalize/configure base url.
    const followingPollingUri =
        `https://api.twitch.tv/kraken/channels/${twitchUserId}/follows?limit=${config.followingPollingLimit}`;

    // TODO: externalize/configure base url.
    const streamingPollingUri = `https://api.twitch.tv/helix/streams?user_id=${twitchUserId}`;

    // TODO: externalize/configure base url.
    const cheermotesPollingUri = `https://api.twitch.tv/kraken/bits/actions?channel_id=${twitchUserId}`;

    const twitchIrcConnection = new TwitchIrcConnection(
        rootLogger,
        config.twitchIrcWebSocketUri,
        config.twitchChannelName,
        config.twitchUserName,
        twitchUserAccessTokenProvider,
    );

    const twitchPollingFollowingConnection = new PollingClientIdConnection<IPollingFollowingResponse>(
        rootLogger,
        config.twitchAppClientId,
        config.bottenNappetDefaultPollingInterval,
        false,
        followingPollingUri,
        "get",
    );
    const twitchPollingStreamingConnection = new PollingClientIdConnection<IPollingStreamingResponse>(
        rootLogger,
        config.twitchAppClientId,
        config.bottenNappetStreamingPollingInterval,
        true,
        streamingPollingUri,
        "get",
    );
    const twitchPollingCheermotesConnection = new PollingClientIdConnection<IPollingCheermotesResponse>(
        rootLogger,
        config.twitchAppClientId,
        config.bottenNappetCheermotesPollingInterval,
        true,
        cheermotesPollingUri,
        "get",
    );

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
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchOutgoingIrcCommand>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchOutgoingIrcCommand),
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

    const vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<IOutgoingSearchCommand>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicVidyOutgoingSearchCommand),
        );
    const vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSearchResultEvent>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicVidyIncomingSearchResultEvent),
        );

    const connectables: IConnectable[] = [
        twitchIrcConnection,
        twitchPollingFollowingConnection,
        twitchPollingStreamingConnection,
        twitchPollingCheermotesConnection,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent,
        vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
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

            perUserHandlersMain(
                config,
                authenticatedApplicationMainLogger,
                rootLogger,
                gracefulShutdownManager,
                messageQueuePublisher,
                twitchIrcConnection,
                twitchPollingFollowingConnection,
                twitchPollingStreamingConnection,
                twitchPollingCheermotesConnection,
                twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
                twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
                twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
                twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent,
                twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent,
                twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent,
                twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
                twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent,
                twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent,
                vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
                vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent,
                twitchUserId,
            ),
        ]);

        await disconnect();
    } catch (error) {
        disconnect(error);
    }
}
