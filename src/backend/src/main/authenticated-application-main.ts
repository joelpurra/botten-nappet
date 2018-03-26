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

import IConnectable from "../../../shared/src/connection/iconnectable";

import GracefulShutdownManager from "../../../shared/src/util/graceful-shutdown-manager";
import PinoLogger from "../../../shared/src/util/pino-logger";
import Config from "../config/config";

import UserStorageManager from "../storage/manager/user-storage-manager";
import UserRepository from "../storage/repository/user-repository";

import MessageQueuePublisher from "../../../shared/src/message-queue/publisher";
/* tslint:disable:max-line-length */
import MessageQueueSingleItemJsonTopicsSubscriber from "../../../shared/src/message-queue/single-item-topics-subscriber";
/* tslint:enable:max-line-length */

import TwitchApplicationTokenManager from "../twitch/authentication/application-token-manager";
import {
    ApplicationAccessTokenProviderType,
    AugmentedTokenProviderType,
    UserAccessTokenProviderType,
} from "../twitch/authentication/provider-types";
import TwitchUserTokenManager from "../twitch/authentication/user-token-manager";

import TwitchCSRFHelper from "../twitch/helper/csrf-helper";
import TwitchRequestHelper from "../twitch/helper/request-helper";
import TwitchTokenHelper from "../twitch/helper/token-helper";
import TwitchUserHelper from "../twitch/helper/user-helper";
import TwitchUserTokenHelper from "../twitch/helper/user-token-helper";

import ITwitchIncomingIrcCommand from "../twitch/irc/command/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "../twitch/irc/command/ioutgoing-irc-command";
import TwitchIrcConnection from "../twitch/irc/irc-connection";

import PollingClientIdConnection from "../twitch/polling/connection/polling-clientid-connection";

import TwitchPubSubConnection from "../twitch/pubsub/pubsub-connection";

import IIncomingSearchResultEvent from "../../vidy/command/iincoming-search-result-event";
import IOutgoingSearchCommand from "../../vidy/command/ioutgoing-search-command";
import IIncomingCheeringEvent from "../twitch/polling/event/iincoming-cheering-event";
import IIncomingCheermotesEvent from "../twitch/polling/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "../twitch/polling/event/iincoming-following-event";
import IIncomingPubSubEvent from "../twitch/polling/event/iincoming-pubsub-event";
import IIncomingStreamingEvent from "../twitch/polling/event/iincoming-streaming-event";
import IIncomingSubscriptionEvent from "../twitch/polling/event/iincoming-subscription-event";
import IIncomingWhisperEvent from "../twitch/polling/event/iincoming-whisper-event";
import IPollingCheermotesResponse from "../twitch/polling/handler/icheermotes-polling-response";
import IPollingFollowingResponse from "../twitch/polling/handler/ifollowing-polling-response";
import IPollingStreamingResponse from "../twitch/polling/handler/istreaming-polling-response";
import perUserHandlersMain from "./per-user-handlers-main";

export default async function authenticatedApplicationMain(
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchApplicationTokenManager: TwitchApplicationTokenManager,
    twitchRequestHelper: TwitchRequestHelper,
    twitchCSRFHelper: TwitchCSRFHelper,
    twitchTokenHelper: TwitchTokenHelper,
): Promise<void> {
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

    const allPubSubTopicsForTwitchUserId = [
        `channel-bits-events-v1.${twitchUserId}`,
        `channel-subscribe-events-v1.${twitchUserId}`,
        `channel-commerce-events-v1.${twitchUserId}`,
        `whispers.${twitchUserId}`,
    ];

    // TODO: externalize/configure base url.
    const followingPollingUri =
        `https://api.twitch.tv/kraken/channels/${twitchUserId}/follows?limit=${config.followingPollingLimit}`;

    // TODO: externalize/configure base url.
    const streamingPollingUri = `https://api.twitch.tv/helix/streams?user_id=${twitchUserId}`;

    // TODO: externalize/configure base url.
    const cheermotesPollingUri = `https://api.twitch.tv/kraken/bits/actions?channel_id=${twitchUserId}`;

    const twitchAllPubSubTopicsForTwitchUserIdConnection = new TwitchPubSubConnection(
        rootLogger,
        config.twitchPubSubWebSocketUri,
        allPubSubTopicsForTwitchUserId,
        twitchUserAccessTokenProvider,
    );

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
        twitchAllPubSubTopicsForTwitchUserIdConnection,
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

    mainLogger.info("Connected.");

    const disconnect = async (incomingError?: Error) => {
        await Bluebird.map(connectables, async (connectable) => {
            try {
                connectable.disconnect();
            } catch (error) {
                mainLogger.error(error, connectable, "Swallowed error while disconnecting.");
            }
        });

        if (incomingError) {
            mainLogger.error(incomingError, "Disconnected.");

            throw incomingError;
        }

        mainLogger.info("Disconnected.");

        return undefined;
    };

    try {
        await perUserHandlersMain(
            config,
            mainLogger,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            twitchIrcConnection,
            twitchPollingFollowingConnection,
            twitchPollingStreamingConnection,
            twitchPollingCheermotesConnection,
            twitchAllPubSubTopicsForTwitchUserIdConnection,
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
        );

        await disconnect();
    } catch (error) {
        disconnect(error);
    }
}
