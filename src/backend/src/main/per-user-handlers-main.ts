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

import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

/* tslint:disable max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/message-queue/single-item-topics-subscriber";
import MessageQueueTopicPublisher from "@botten-nappet/shared/message-queue/topic-publisher";

import ITwitchIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/command/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/command/ioutgoing-irc-command";
import TwitchIrcFollowReminderHandler from "@botten-nappet/backend-twitch/irc/handler/follow-reminder";
import TwitchIrcGreetingHandler from "@botten-nappet/backend-twitch/irc/handler/greeting";
import TwitchIrcLoggingHandler from "@botten-nappet/backend-twitch/irc/handler/logging";
import TwitchIrcNewChatterHandler from "@botten-nappet/backend-twitch/irc/handler/new-chatter";
import TwitchIrcPingHandler from "@botten-nappet/backend-twitch/irc/handler/ping";
import TwitchIrcReconnectHandler from "@botten-nappet/backend-twitch/irc/handler/reconnect";
import TwitchIrcSubscribingHandler from "@botten-nappet/backend-twitch/irc/handler/subscribing";
import TwitchIrcVidyCommandHandler from "@botten-nappet/backend-twitch/irc/handler/vidy-command";
import TwitchIrcVidyResultEventHandler from "@botten-nappet/backend-twitch/irc/handler/vidy-result-event";
import TwitchIrcConnection from "@botten-nappet/backend-twitch/irc/irc-connection";

import TwitchIncomingIrcCommandEventTranslator from "@botten-nappet/backend-twitch/irc/event-handler/incoming-irc-command-event-translator";
import TwitchOutgoingIrcCommandEventHandler from "@botten-nappet/backend-twitch/irc/event-handler/outgoing-irc-command-event-handler";
import TwitchIrcTextResponseCommandHandler from "@botten-nappet/backend-twitch/irc/handler/text-response-command";

import PollingClientIdConnection from "@botten-nappet/backend-twitch/polling/connection/polling-clientid-connection";
import TwitchCheeringIrcReplyHandler from "@botten-nappet/backend-twitch/polling/handler/cheering-irc-reply-handler";
import TwitchCheeringWithCheermotesHandler from "@botten-nappet/backend-twitch/polling/handler/cheering-with-cheermotes-handler";
import TwitchFollowingIrcReplyHandler from "@botten-nappet/backend-twitch/polling/handler/following-irc-reply-handler";
import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/polling/handler/icheermotes-polling-response";
import IPollingFollowingResponse from "@botten-nappet/backend-twitch/polling/handler/ifollowing-polling-response";
import IPollingStreamingResponse from "@botten-nappet/backend-twitch/polling/handler/istreaming-polling-response";
import TwitchStreamingStatisticsCollectorHandler from "@botten-nappet/backend-twitch/polling/handler/streaming-statistics-collector-handler";
import TwitchSubscriptionIrcReplyHandler from "@botten-nappet/backend-twitch/polling/handler/subscription-irc-reply-handler";
import TwitchWhisperIrcReplyHandler from "@botten-nappet/backend-twitch/polling/handler/whisper-irc-reply-handler";

import IncomingCheeringCommandEventTranslator from "@botten-nappet/backend-twitch/polling/event-handler/incoming-cheering-event-translator";
import IncomingCheermotesCommandEventTranslator from "@botten-nappet/backend-twitch/polling/event-handler/incoming-cheermotes-event-translator";
import IncomingFollowingCommandEventTranslator from "@botten-nappet/backend-twitch/polling/event-handler/incoming-following-event-translator";
import IncomingStreamingCommandEventTranslator from "@botten-nappet/backend-twitch/polling/event-handler/incoming-streaming-event-translator";
import IncomingSubscriptionCommandEventTranslator from "@botten-nappet/backend-twitch/polling/event-handler/incoming-subscription-event-translator";

import IIncomingCheeringEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-cheering-event";
import IIncomingCheeringWithCheermotesEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-cheering-with-cheermotes-event";
import IIncomingCheermotesEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-following-event";
import IIncomingPubSubEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-pubsub-event";
import IIncomingStreamingEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-streaming-event";
import IIncomingSubscriptionEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-subscription-event";

import VidyIIncomingSearchResultEvent from "@botten-nappet/backend-vidy/command/iincoming-search-result-event";
import VidyIOutgoingSearchCommand from "@botten-nappet/backend-vidy/command/ioutgoing-search-command";
import VidyOutgoingSearchCommandHandler from "@botten-nappet/backend-vidy/outgoing-search-command-handler";
import VidyAuthenticatedRequest from "@botten-nappet/backend-vidy/request/authenticated-request";

import IncomingWhisperCommandEventTranslator from "@botten-nappet/backend-twitch/polling/event-handler/incoming-whisper-event-translator";
import IIncomingWhisperEvent from "@botten-nappet/backend-twitch/polling/event/iincoming-whisper-event";

/* tslint:enable max-line-length */

export default async function perUserHandlersMain(
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchIrcConnection: TwitchIrcConnection,
    twitchPollingFollowingConnection: PollingClientIdConnection<IPollingFollowingResponse>,
    twitchPollingStreamingConnection: PollingClientIdConnection<IPollingStreamingResponse>,
    twitchPollingCheermotesConnection: PollingClientIdConnection<IPollingCheermotesResponse>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<IIncomingPubSubEvent>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<ITwitchOutgoingIrcCommand>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<IIncomingFollowingEvent>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<IIncomingStreamingEvent>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheermotesEvent>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheeringEvent>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<IIncomingWhisperEvent>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSubscriptionEvent>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<VidyIOutgoingSearchCommand>,
    vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<VidyIIncomingSearchResultEvent>,
    twitchUserId: number,
): Promise<void> {
    const twitchIrcReconnectHandler = new TwitchIrcReconnectHandler(
        rootLogger,
        twitchIrcConnection,
    );

    const messageQueueTopicPublisherForIIncomingIrcCommand =
        new MessageQueueTopicPublisher<ITwitchIncomingIrcCommand>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingIrcCommand,
        );

    const messageQueueTopicPublisherForIOutgoingIrcCommand =
        new MessageQueueTopicPublisher<ITwitchOutgoingIrcCommand>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchOutgoingIrcCommand,
        );

    const messageQueueTopicPublisherForIIncomingFollowingEvent =
        new MessageQueueTopicPublisher<IIncomingFollowingEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingFollowingEvent,
        );

    const messageQueueTopicPublisherForIIncomingStreamingEvent =
        new MessageQueueTopicPublisher<IIncomingStreamingEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingStreamingEvent,
        );

    const messageQueueTopicPublisherForIIncomingCheermotesEvent =
        new MessageQueueTopicPublisher<IIncomingCheermotesEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingCheermotesEvent,
        );

    const messageQueueTopicPublisherForIIncomingCheeringEvent =
        new MessageQueueTopicPublisher<IIncomingCheeringEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingCheeringEvent,
        );

    const messageQueueTopicPublisherForIIncomingWhisperEvent =
        new MessageQueueTopicPublisher<IIncomingWhisperEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingWhisperEvent,
        );

    const messageQueueTopicPublisherForIIncomingSubscriptionEvent =
        new MessageQueueTopicPublisher<IIncomingSubscriptionEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingSubscriptionEvent,
        );

    const messageQueueTopicPublisherForIIncomingCheeringWithCheermotesEvent =
        new MessageQueueTopicPublisher<IIncomingCheeringWithCheermotesEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingCheeringWithCheermotesEvent,
        );

    const messageQueueTopicPublisherForIOutgoingSearchCommand =
        new MessageQueueTopicPublisher<VidyIOutgoingSearchCommand>(
            rootLogger,
            messageQueuePublisher,
            config.topicVidyOutgoingSearchCommand,
        );

    const messageQueueTopicPublisherForIIncomingSearchResultEvent =
        new MessageQueueTopicPublisher<VidyIIncomingSearchResultEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicVidyIncomingSearchResultEvent,
        );

    const twitchIncomingIrcCommandEventTranslator = new TwitchIncomingIrcCommandEventTranslator(
        rootLogger,
        twitchIrcConnection,
        messageQueueTopicPublisherForIIncomingIrcCommand,
    );

    const vidyAuthenticatedRequest = new VidyAuthenticatedRequest(rootLogger, config);

    const vidyOutgoingSearchCommandHandler = new VidyOutgoingSearchCommandHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
        messageQueueTopicPublisherForIIncomingSearchResultEvent,
        vidyAuthenticatedRequest,
        config.vidyRootUrl,
    );

    const twitchOutgoingIrcCommandEventHandler = new TwitchOutgoingIrcCommandEventHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
        twitchIrcConnection,
    );

    const twitchIrcVidyCommandHandler = new TwitchIrcVidyCommandHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        messageQueueTopicPublisherForIOutgoingSearchCommand,
    );
    const twitchIrcVidyResultEventHandler = new TwitchIrcVidyResultEventHandler(
        rootLogger,
        vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
        config.twitchChannelName,
        config.vidyVideoLinkBaseUrl,
    );

    const twitchIrcTextResponseCommandHandler = new TwitchIrcTextResponseCommandHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
    );

    const twitchIrcLoggingHandler = new TwitchIrcLoggingHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
    );
    const twitchIrcPingHandler = new TwitchIrcPingHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
    );
    const twitchIrcGreetingHandler = new TwitchIrcGreetingHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
        config.twitchUserName,
    );
    const twitchIrcNewChatterHandler = new TwitchIrcNewChatterHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
    );
    const twitchIrcSubscribingHandler = new TwitchIrcSubscribingHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
    );
    const twitchIrcFollowReminderHandler = new TwitchIrcFollowReminderHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
        config.twitchChannelName,
    );

    const twitchIncomingFollowingCommandEventTranslator = new IncomingFollowingCommandEventTranslator(
        rootLogger,
        twitchPollingFollowingConnection,
        messageQueueTopicPublisherForIIncomingFollowingEvent,
        config.twitchUserName,
        twitchUserId,
    );
    const twitchFollowingIrcReplyHandler = new TwitchFollowingIrcReplyHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
    );

    const twitchIncomingStreamingCommandEventTranslator = new IncomingStreamingCommandEventTranslator(
        rootLogger,
        twitchPollingStreamingConnection,
        messageQueueTopicPublisherForIIncomingStreamingEvent,
        config.twitchUserName,
        twitchUserId,
    );
    const twitchStreamingStatisticsCollector = new TwitchStreamingStatisticsCollectorHandler(
        rootLogger,
        [
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent,
            twitchIrcConnection,
        ],
        messageQueueTopicPublisherForIOutgoingIrcCommand,
    );

    const twitchCheeringWithCheermotesHandler = new TwitchCheeringWithCheermotesHandler(
        rootLogger,
        [
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent,
        ],
        messageQueueTopicPublisherForIIncomingCheeringWithCheermotesEvent,
    );

    const twitchIncomingCheermotesCommandEventTranslator = new IncomingCheermotesCommandEventTranslator(
        rootLogger,
        twitchPollingCheermotesConnection,
        messageQueueTopicPublisherForIIncomingCheermotesEvent,
        config.twitchUserName,
        twitchUserId,
    );

    const twitchIncomingWhisperCommandEventTranslator = new IncomingWhisperCommandEventTranslator(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
        messageQueueTopicPublisherForIIncomingWhisperEvent,
    );
    const twitchWhisperIrcReplyHandler = new TwitchWhisperIrcReplyHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
        config.twitchChannelName,
    );

    const twitchIncomingCheeringCommandEventTranslator = new IncomingCheeringCommandEventTranslator(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
        messageQueueTopicPublisherForIIncomingCheeringEvent,
    );
    const twitchCheeringIrcReplyHandler = new TwitchCheeringIrcReplyHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
    );

    const twitchIncomingSubscriptionCommandEventTranslator = new IncomingSubscriptionCommandEventTranslator(
        rootLogger,
        twitchIrcConnection,
        messageQueueTopicPublisherForIIncomingSubscriptionEvent,
        config.twitchUserName,
        twitchUserId,
    );
    const twitchSubscriptionIrcReplyHandler = new TwitchSubscriptionIrcReplyHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
    );

    const startables: IStartableStoppable[] = [
        twitchIrcReconnectHandler,
        twitchIrcLoggingHandler,
        twitchIrcPingHandler,
        twitchIrcGreetingHandler,
        twitchIrcNewChatterHandler,
        twitchIrcSubscribingHandler,
        twitchIrcFollowReminderHandler,
        twitchIncomingFollowingCommandEventTranslator,
        twitchFollowingIrcReplyHandler,
        twitchIncomingStreamingCommandEventTranslator,
        twitchStreamingStatisticsCollector,
        twitchCheeringWithCheermotesHandler,
        twitchIncomingCheermotesCommandEventTranslator,
        twitchIncomingCheeringCommandEventTranslator,
        twitchIncomingWhisperCommandEventTranslator,
        twitchCheeringIrcReplyHandler,
        twitchWhisperIrcReplyHandler,
        twitchIncomingSubscriptionCommandEventTranslator,
        twitchSubscriptionIrcReplyHandler,
        twitchIncomingIrcCommandEventTranslator,
        twitchOutgoingIrcCommandEventHandler,
        twitchIrcTextResponseCommandHandler,
        vidyOutgoingSearchCommandHandler,
        twitchIrcVidyCommandHandler,
        twitchIrcVidyResultEventHandler,
    ];

    const stop = async (incomingError?: Error) => {
        await Bluebird.map(startables, async (startable) => {
            try {
                startable.stop();
            } catch (error) {
                mainLogger.error(error, startable, "Swallowed error while stopping.");
            }
        });

        if (incomingError) {
            mainLogger.error(incomingError, "Stopped.");

            throw incomingError;
        }

        mainLogger.info("Stopped.");

        return undefined;
    };

    try {
        await Bluebird.map(startables, async (startable) => startable.start());

        mainLogger.info({
            twitchUserId,
            twitchUserName: config.twitchUserName,
        }, "Started listening to events");

        await gracefulShutdownManager.waitForShutdownSignal();

        await stop();
    } catch (error) {
        stop(error);
    }
}
