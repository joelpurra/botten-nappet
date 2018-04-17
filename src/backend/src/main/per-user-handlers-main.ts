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

import IncomingCheeringCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-cheering-event-translator";
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

import VidyIIncomingSearchResultEvent from "@botten-nappet/interface-vidy/command/iincoming-search-result-event";
import VidyIOutgoingSearchCommand from "@botten-nappet/interface-vidy/command/ioutgoing-search-command";

/* tslint:enable max-line-length */

export default class PerUserHandlersMain implements IStartableStoppable {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        private config: Config,
        logger: PinoLogger,
        private gracefulShutdownManager: GracefulShutdownManager,
        private messageQueuePublisher: MessageQueuePublisher,
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent:
            MessageQueueSingleItemJsonTopicsSubscriber<IIncomingPubSubEvent>,
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
            MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>,
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent:
            MessageQueueSingleItemJsonTopicsSubscriber<IIncomingFollowingEvent>,
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent:
            MessageQueueSingleItemJsonTopicsSubscriber<IIncomingStreamingEvent>,
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent:
            MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheermotesEvent>,
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent:
            MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheeringEvent>,
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent:
            MessageQueueSingleItemJsonTopicsSubscriber<IIncomingWhisperEvent>,
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent:
            MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSubscriptionEvent>,
        private vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent:
            MessageQueueSingleItemJsonTopicsSubscriber<VidyIIncomingSearchResultEvent>,
        private twitchUserId: number,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    public async start(): Promise<void> {
        const messageQueueTopicPublisherForIOutgoingIrcCommand =
            new MessageQueueTopicPublisher<ITwitchOutgoingIrcCommand>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchOutgoingIrcCommand,
            );

        const messageQueueTopicPublisherForIIncomingCheeringEvent =
            new MessageQueueTopicPublisher<IIncomingCheeringEvent>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchIncomingCheeringEvent,
            );

        const messageQueueTopicPublisherForIIncomingWhisperEvent =
            new MessageQueueTopicPublisher<IIncomingWhisperEvent>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchIncomingWhisperEvent,
            );

        const messageQueueTopicPublisherForIIncomingSubscriptionEvent =
            new MessageQueueTopicPublisher<IIncomingSubscriptionEvent>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchIncomingSubscriptionEvent,
            );

        const messageQueueTopicPublisherForIIncomingCheeringWithCheermotesEvent =
            new MessageQueueTopicPublisher<IIncomingCheeringWithCheermotesEvent>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchIncomingCheeringWithCheermotesEvent,
            );

        const messageQueueTopicPublisherForIOutgoingSearchCommand =
            new MessageQueueTopicPublisher<VidyIOutgoingSearchCommand>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicVidyOutgoingSearchCommand,
            );

        const twitchIrcVidyCommandHandler = new TwitchIrcVidyCommandHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            messageQueueTopicPublisherForIOutgoingSearchCommand,
        );
        const twitchIrcVidyResultEventHandler = new TwitchIrcVidyResultEventHandler(
            this.logger,
            this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.config.twitchChannelName,
            this.config.vidyVideoLinkBaseUrl,
        );

        const twitchIrcTextResponseCommandHandler = new TwitchIrcTextResponseCommandHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchIrcGreetingHandler = new TwitchIrcGreetingHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.config.twitchUserName,
        );
        const twitchIrcNewChatterHandler = new TwitchIrcNewChatterHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
        );
        const twitchIrcSubscribingHandler = new TwitchIrcSubscribingHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
        );
        const twitchIrcFollowReminderHandler = new TwitchIrcFollowReminderHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.config.twitchChannelName,
        );

        const twitchFollowingIrcReplyHandler = new TwitchFollowingIrcReplyHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchStreamingStatisticsCollector = new TwitchStreamingStatisticsCollectorHandler(
            this.logger,
            [
                this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent,
                this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            ],
            messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchCheeringWithCheermotesHandler = new TwitchCheeringWithCheermotesHandler(
            this.logger,
            [
                this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
                this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent,
            ],
            messageQueueTopicPublisherForIIncomingCheeringWithCheermotesEvent,
        );

        const twitchIncomingWhisperCommandEventTranslator = new IncomingWhisperCommandEventTranslator(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
            messageQueueTopicPublisherForIIncomingWhisperEvent,
        );
        const twitchWhisperIrcReplyHandler = new TwitchWhisperIrcReplyHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.config.twitchChannelName,
        );

        const twitchIncomingCheeringCommandEventTranslator = new IncomingCheeringCommandEventTranslator(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
            messageQueueTopicPublisherForIIncomingCheeringEvent,
        );
        const twitchCheeringIrcReplyHandler = new TwitchCheeringIrcReplyHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchIncomingSubscriptionCommandEventTranslator = new IncomingSubscriptionCommandEventTranslator(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            messageQueueTopicPublisherForIIncomingSubscriptionEvent,
            this.config.twitchUserName,
            this.twitchUserId,
        );
        const twitchSubscriptionIrcReplyHandler = new TwitchSubscriptionIrcReplyHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent,
            messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        this.startables.push(twitchIncomingCheeringCommandEventTranslator);
        this.startables.push(twitchIncomingWhisperCommandEventTranslator);
        this.startables.push(twitchIncomingSubscriptionCommandEventTranslator);
        this.startables.push(twitchIrcGreetingHandler);
        this.startables.push(twitchIrcNewChatterHandler);
        this.startables.push(twitchIrcSubscribingHandler);
        this.startables.push(twitchIrcFollowReminderHandler);
        this.startables.push(twitchFollowingIrcReplyHandler);
        this.startables.push(twitchStreamingStatisticsCollector);
        this.startables.push(twitchCheeringWithCheermotesHandler);
        this.startables.push(twitchCheeringIrcReplyHandler);
        this.startables.push(twitchWhisperIrcReplyHandler);
        this.startables.push(twitchSubscriptionIrcReplyHandler);
        this.startables.push(twitchIrcTextResponseCommandHandler);
        this.startables.push(twitchIrcVidyCommandHandler);
        this.startables.push(twitchIrcVidyResultEventHandler);

        await Bluebird.map(this.startables, async (startable) => startable.start());

        this.logger.info({
            twitchUserId: this.twitchUserId,
            twitchUserName: this.config.twitchUserName,
        }, "Started listening to events");

        await this.gracefulShutdownManager.waitForShutdownSignal();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await Bluebird.map(
            this.startables,
            async (startable) => {
                try {
                    await startable.stop();
                } catch (error) {
                    this.logger.error(error, startable, "Swallowed error while stopping.");
                }
            },
        );
    }
}
