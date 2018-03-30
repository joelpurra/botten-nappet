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

import ITwitchIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";

import TwitchCheeringIrcReplyHandler from "@botten-nappet/backend-twitch/handler/cheering-irc-reply-handler";
import TwitchCheeringWithCheermotesHandler from "@botten-nappet/backend-twitch/handler/cheering-with-cheermotes-handler";
import TwitchIrcFollowReminderHandler from "@botten-nappet/backend-twitch/handler/follow-reminder";
import TwitchFollowingIrcReplyHandler from "@botten-nappet/backend-twitch/handler/following-irc-reply-handler";
import TwitchIrcGreetingHandler from "@botten-nappet/backend-twitch/handler/greeting";
import TwitchIrcNewChatterHandler from "@botten-nappet/backend-twitch/handler/new-chatter";
import TwitchStreamingStatisticsCollectorHandler from "@botten-nappet/backend-twitch/handler/streaming-statistics-collector-handler";
import TwitchIrcSubscribingHandler from "@botten-nappet/backend-twitch/handler/subscribing";
import TwitchSubscriptionIrcReplyHandler from "@botten-nappet/backend-twitch/handler/subscription-irc-reply-handler";
import TwitchIrcTextResponseCommandHandler from "@botten-nappet/backend-twitch/handler/text-response-command";
import TwitchIrcVidyCommandHandler from "@botten-nappet/backend-twitch/handler/vidy-command";
import TwitchIrcVidyResultEventHandler from "@botten-nappet/backend-twitch/handler/vidy-result-event";
import TwitchWhisperIrcReplyHandler from "@botten-nappet/backend-twitch/handler/whisper-irc-reply-handler";

import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/interface/response/polling/icheermotes-polling-response";
import IPollingFollowingResponse from "@botten-nappet/backend-twitch/interface/response/polling/ifollowing-polling-response";
import IPollingStreamingResponse from "@botten-nappet/backend-twitch/interface/response/polling/istreaming-polling-response";
import PollingClientIdConnection from "@botten-nappet/backend-twitch/polling/connection/polling-clientid-connection";

import IncomingCheeringCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-cheering-event-translator";
import IncomingCheermotesCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-cheermotes-event-translator";
import IncomingFollowingCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-following-event-translator";
import IncomingStreamingCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-streaming-event-translator";
import IncomingSubscriptionCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-subscription-event-translator";
import IncomingWhisperCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-whisper-event-translator";

import IIncomingPubSubEvent from "@botten-nappet/backend-twitch/pubsub/interface/iincoming-pubsub-event";

import IIncomingCheeringEvent from "@botten-nappet/interface-twitch/event/iincoming-cheering-event";
import IIncomingCheeringWithCheermotesEvent from "@botten-nappet/interface-twitch/event/iincoming-cheering-with-cheermotes-event";
import IIncomingCheermotesEvent from "@botten-nappet/interface-twitch/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "@botten-nappet/interface-twitch/event/iincoming-following-event";
import IIncomingStreamingEvent from "@botten-nappet/interface-twitch/event/iincoming-streaming-event";
import IIncomingSubscriptionEvent from "@botten-nappet/interface-twitch/event/iincoming-subscription-event";
import IIncomingWhisperEvent from "@botten-nappet/interface-twitch/event/iincoming-whisper-event";

import VidyOutgoingSearchCommandHandler from "@botten-nappet/backend-vidy/outgoing-search-command-handler";
import VidyAuthenticatedRequest from "@botten-nappet/backend-vidy/request/authenticated-request";
import VidyIIncomingSearchResultEvent from "@botten-nappet/interface-vidy/command/iincoming-search-result-event";
import VidyIOutgoingSearchCommand from "@botten-nappet/interface-vidy/command/ioutgoing-search-command";

/* tslint:enable max-line-length */

export default async function perUserHandlersMain(
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchPollingFollowingConnection: PollingClientIdConnection<IPollingFollowingResponse>,
    twitchPollingStreamingConnection: PollingClientIdConnection<IPollingStreamingResponse>,
    twitchPollingCheermotesConnection: PollingClientIdConnection<IPollingCheermotesResponse>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<IIncomingPubSubEvent>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>,
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

    const vidyAuthenticatedRequest = new VidyAuthenticatedRequest(rootLogger, config);

    const vidyOutgoingSearchCommandHandler = new VidyOutgoingSearchCommandHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
        messageQueueTopicPublisherForIIncomingSearchResultEvent,
        vidyAuthenticatedRequest,
        config.vidyRootUrl,
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
            twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
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
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
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
        twitchIncomingFollowingCommandEventTranslator,
        twitchIncomingStreamingCommandEventTranslator,
        twitchIncomingCheermotesCommandEventTranslator,
        twitchIncomingCheeringCommandEventTranslator,
        twitchIncomingWhisperCommandEventTranslator,
        twitchIncomingSubscriptionCommandEventTranslator,
        twitchIrcGreetingHandler,
        twitchIrcNewChatterHandler,
        twitchIrcSubscribingHandler,
        twitchIrcFollowReminderHandler,
        twitchFollowingIrcReplyHandler,
        twitchStreamingStatisticsCollector,
        twitchCheeringWithCheermotesHandler,
        twitchCheeringIrcReplyHandler,
        twitchWhisperIrcReplyHandler,
        twitchSubscriptionIrcReplyHandler,
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
