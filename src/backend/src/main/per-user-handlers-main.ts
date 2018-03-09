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

import IStartableStoppable from "../../../shared/src/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "../../../shared/src/util/graceful-shutdown-manager";
import PinoLogger from "../../../shared/src/util/pino-logger";
import Config from "../config/config";

import MessageQueuePublisher from "../../../shared/src/message-queue/publisher";
/* tslint:disable:max-line-length */
import MessageQueueSingleItemJsonTopicsSubscriber from "../../../shared/src/message-queue/single-item-topics-subscriber";
/* tslint:enable:max-line-length */
import MessageQueueTopicPublisher from "../../../shared/src/message-queue/topic-publisher";

import ITwitchIncomingIrcCommand from "../twitch/irc/command/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "../twitch/irc/command/ioutgoing-irc-command";
import TwitchIrcFollowReminderHandler from "../twitch/irc/handler/follow-reminder";
import TwitchIrcGreetingHandler from "../twitch/irc/handler/greeting";
import TwitchIrcLoggingHandler from "../twitch/irc/handler/logging";
import TwitchIrcNewChatterHandler from "../twitch/irc/handler/new-chatter";
import TwitchIrcPingHandler from "../twitch/irc/handler/ping";
import TwitchIrcReconnectHandler from "../twitch/irc/handler/reconnect";
import TwitchIrcSubscribingHandler from "../twitch/irc/handler/subscribing";
import TwitchIrcVidyCommandHandler from "../twitch/irc/handler/vidy-command";
import TwitchIrcVidyResultEventHandler from "../twitch/irc/handler/vidy-result-event";
import TwitchIrcConnection from "../twitch/irc/irc-connection";

import TwitchIncomingIrcCommandEventTranslator from "../twitch/irc/event-handler/incoming-irc-command-event-translator";
import TwitchOutgoingIrcCommandEventHandler from "../twitch/irc/event-handler/outgoing-irc-command-event-handler";
import TwitchIrcTextResponseCommandHandler from "../twitch/irc/handler/text-response-command";

import PollingClientIdConnection from "../twitch/polling/connection/polling-clientid-connection";
import TwitchCheeringIrcReplyHandler from "../twitch/polling/handler/cheering-irc-reply-handler";
/* tslint:enable max-line-length */
import TwitchCheeringWithCheermotesHandler from "../twitch/polling/handler/cheering-with-cheermotes-handler";
import TwitchFollowingIrcReplyHandler from "../twitch/polling/handler/following-irc-reply-handler";
import IPollingCheermotesResponse from "../twitch/polling/handler/icheermotes-polling-response";
import IPollingFollowingResponse from "../twitch/polling/handler/ifollowing-polling-response";
import IPollingStreamingResponse from "../twitch/polling/handler/istreaming-polling-response";
/* tslint:disable max-line-length */
import TwitchStreamingStatisticsCollectorHandler from "../twitch/polling/handler/streaming-statistics-collector-handler";
import TwitchSubscriptionIrcReplyHandler from "../twitch/polling/handler/subscription-irc-reply-handler";

/* tslint:disable max-line-length */
import IncomingCheeringCommandEventTranslator from "../twitch/polling/event-handler/incoming-cheering-event-translator";
import IncomingCheermotesCommandEventTranslator from "../twitch/polling/event-handler/incoming-cheermotes-event-translator";
import IncomingFollowingCommandEventTranslator from "../twitch/polling/event-handler/incoming-following-event-translator";
import IncomingPubSubEventTranslator from "../twitch/polling/event-handler/incoming-pubsub-event-translator";
import IncomingStreamingCommandEventTranslator from "../twitch/polling/event-handler/incoming-streaming-event-translator";
import IncomingSubscriptionCommandEventTranslator from "../twitch/polling/event-handler/incoming-subscription-event-translator";
/* tslint:enable max-line-length */

import IIncomingCheeringEvent from "../twitch/polling/event/iincoming-cheering-event";
import IIncomingCheeringWithCheermotesEvent from "../twitch/polling/event/iincoming-cheering-with-cheermotes-event";
import IIncomingCheermotesEvent from "../twitch/polling/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "../twitch/polling/event/iincoming-following-event";
import IIncomingPubSubEvent from "../twitch/polling/event/iincoming-pubsub-event";
import IIncomingStreamingEvent from "../twitch/polling/event/iincoming-streaming-event";
import IIncomingSubscriptionEvent from "../twitch/polling/event/iincoming-subscription-event";

import VidyIIncomingSearchResultEvent from "../../vidy/command/iincoming-search-result-event";
import VidyIOutgoingSearchCommand from "../../vidy/command/ioutgoing-search-command";
import VidyOutgoingSearchCommandHandler from "../../vidy/outgoing-search-command-handler";
import VidyAuthenticatedRequest from "../../vidy/request/authenticated-request";

import TwitchPubSubLoggingHandler from "../twitch/pubsub/handler/logging";
import TwitchPubSubPingHandler from "../twitch/pubsub/handler/ping";
import TwitchPubSubReconnectHandler from "../twitch/pubsub/handler/reconnect";
import TwitchPubSubConnection from "../twitch/pubsub/pubsub-connection";

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
    twitchAllPubSubTopicsForTwitchUserIdConnection: TwitchPubSubConnection,
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
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSubscriptionEvent>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<VidyIOutgoingSearchCommand>,
    vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent:
        MessageQueueSingleItemJsonTopicsSubscriber<VidyIIncomingSearchResultEvent>,
    twitchUserId: number,
): Promise<void> {
    const twitchPubSubPingHandler = new TwitchPubSubPingHandler(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    );
    const twitchPubSubReconnectHandler = new TwitchPubSubReconnectHandler(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    );
    const twitchPubSubLoggingHandler = new TwitchPubSubLoggingHandler(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    );

    const messageQueueTopicPublisherForIIncomingPubSubEvent =
        new MessageQueueTopicPublisher<IIncomingPubSubEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingPubSubEvent,
        );

    const twitchIncomingPubSubEventTranslator = new IncomingPubSubEventTranslator(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
        messageQueueTopicPublisherForIIncomingPubSubEvent,
    );

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
        twitchPubSubPingHandler,
        twitchPubSubReconnectHandler,
        twitchPubSubLoggingHandler,
        twitchIncomingPubSubEventTranslator,
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
        twitchCheeringIrcReplyHandler,
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
