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
    context,
} from "@botten-nappet/backend-shared/lib/dependency-injection/context/context";
import {
    scoped,
} from "@botten-nappet/backend-shared/lib/dependency-injection/scoped/scoped";
import {
    within,
} from "@botten-nappet/backend-shared/lib/dependency-injection/within/within";
import Bluebird from "bluebird";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import TwitchCheeringIrcReplyHandler from "@botten-nappet/backend-twitch/src/handler/cheering-irc-reply-handler";
import TwitchCheeringWithCheermotesHandler from "@botten-nappet/backend-twitch/src/handler/cheering-with-cheermotes-handler";
import TwitchIrcFollowReminderHandler from "@botten-nappet/backend-twitch/src/handler/follow-reminder";
import TwitchFollowingIrcReplyHandler from "@botten-nappet/backend-twitch/src/handler/following-irc-reply-handler";
import TwitchIrcGreetingHandler from "@botten-nappet/backend-twitch/src/handler/greeting";
import TwitchIrcNewChatterHandler from "@botten-nappet/backend-twitch/src/handler/new-chatter";
import TwitchStreamingStatisticsCollectorHandler from "@botten-nappet/backend-twitch/src/handler/streaming-statistics-collector-handler";
import TwitchIrcSubscribingHandler from "@botten-nappet/backend-twitch/src/handler/subscribing";
import TwitchSubscriptionIrcReplyHandler from "@botten-nappet/backend-twitch/src/handler/subscription-irc-reply-handler";
import TwitchIrcTextResponseCommandHandler from "@botten-nappet/backend-twitch/src/handler/text-response-command";
import TwitchIrcVidyCommandHandler from "@botten-nappet/backend-twitch/src/handler/vidy-command";
import TwitchIrcVidyResultEventHandler from "@botten-nappet/backend-twitch/src/handler/vidy-result-event";
import TwitchWhisperIrcReplyHandler from "@botten-nappet/backend-twitch/src/handler/whisper-irc-reply-handler";

import IncomingCheeringCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-cheering-event-translator";
import IncomingSubscriptionCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-subscription-event-translator";
import IncomingWhisperCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-whisper-event-translator";

import TwitchUserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import TwitchUserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";

import IncomingCheeringEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-cheering-event-topic-publisher";
import IncomingCheeringWithCheermotesEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-cheering-with-cheermotes-event-topic-publisher";
import IncomingSubscriptionEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-subscription-event-topic-publisher";
import IncomingWhisperEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-whisper-event-topic-publisher";
import OutgoingIrcCommandTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/outgoing-irc-command-topic-publisher";
import OutgoingSearchCommandTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/outgoing-search-command-topic-publisher";
import IncomingCheeringEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-cheering-event-single-item-json-topics-subscriber";
import IncomingCheermotesEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-cheermotes-event-single-item-json-topics-subscriber";
import IncomingFollowingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-following-event-single-item-json-topics-subscriber";
import IncomingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-irc-command-single-item-json-topics-subscriber";
import IncomingPubSubEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-pub-sub-event-single-item-json-topics-subscriber";
import IncomingSearchResultEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-search-result-event-single-item-json-topics-subscriber";
import IncomingStreamingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-streaming-event-single-item-json-topics-subscriber";
import IncomingSubscriptionEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-subscription-event-single-item-json-topics-subscriber";
import IncomingWhisperEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-whisper-event-single-item-json-topics-subscriber";

import BackendTwitchIrcAuthenticatedApplicationApi from "@botten-nappet/server-twitch/src/irc-authenticated-application-api";
import BackendTwitchPollingAuthenticatedApplicationApi from "@botten-nappet/server-twitch/src/polling-authenticated-application-api";
import BackendTwitchPubSubAuthenticatedApplicationApi from "@botten-nappet/server-twitch/src/pubsub-authenticated-application-api";

/* tslint:enable max-line-length */

export default class PerUserHandlersMain implements IStartableStoppable {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        private readonly backendConfig: BackendConfig,
        logger: PinoLogger,
        @within(IncomingPubSubEventSingleItemJsonTopicsSubscriber, "BackendAuthenticatedApplicationMain")
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent:
            IncomingPubSubEventSingleItemJsonTopicsSubscriber,
        @within(IncomingIrcCommandSingleItemJsonTopicsSubscriber, "BackendAuthenticatedApplicationMain")
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
            IncomingIrcCommandSingleItemJsonTopicsSubscriber,
        @within(IncomingFollowingEventSingleItemJsonTopicsSubscriber, "BackendAuthenticatedApplicationMain")
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent:
            IncomingFollowingEventSingleItemJsonTopicsSubscriber,
        @within(IncomingStreamingEventSingleItemJsonTopicsSubscriber, "BackendAuthenticatedApplicationMain")
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent:
            IncomingStreamingEventSingleItemJsonTopicsSubscriber,
        @within(IncomingCheermotesEventSingleItemJsonTopicsSubscriber, "BackendAuthenticatedApplicationMain")
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent:
            IncomingCheermotesEventSingleItemJsonTopicsSubscriber,
        @within(IncomingCheeringEventSingleItemJsonTopicsSubscriber, "BackendAuthenticatedApplicationMain")
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent:
            IncomingCheeringEventSingleItemJsonTopicsSubscriber,
        @within(IncomingWhisperEventSingleItemJsonTopicsSubscriber, "BackendAuthenticatedApplicationMain")
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent:
            IncomingWhisperEventSingleItemJsonTopicsSubscriber,
        @within(IncomingSubscriptionEventSingleItemJsonTopicsSubscriber, "BackendAuthenticatedApplicationMain")
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent:
            IncomingSubscriptionEventSingleItemJsonTopicsSubscriber,
        @within(IncomingSearchResultEventSingleItemJsonTopicsSubscriber, "BackendAuthenticatedApplicationMain")
        private vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent:
            IncomingSearchResultEventSingleItemJsonTopicsSubscriber,
        @scoped(OutgoingIrcCommandTopicPublisher)
        private readonly messageQueueTopicPublisherForIOutgoingIrcCommand:
            OutgoingIrcCommandTopicPublisher,
        @scoped(IncomingCheeringEventTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingCheeringEvent:
            IncomingCheeringEventTopicPublisher,
        @scoped(IncomingWhisperEventTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingWhisperEvent:
            IncomingWhisperEventTopicPublisher,
        @scoped(IncomingSubscriptionEventTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingSubscriptionEvent:
            IncomingSubscriptionEventTopicPublisher,
        @scoped(IncomingCheeringWithCheermotesEventTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingCheeringWithCheermotesEvent:
            IncomingCheeringWithCheermotesEventTopicPublisher,
        @scoped(OutgoingSearchCommandTopicPublisher)
        private readonly messageQueueTopicPublisherForIOutgoingSearchCommand:
            OutgoingSearchCommandTopicPublisher,
        @scoped(TwitchUserNameProvider)
        private readonly twitchUserNameProvider: TwitchUserNameProvider,
        @scoped(TwitchUserIdProvider)
        private readonly twitchUserIdProvider: TwitchUserIdProvider,
        @context(BackendTwitchPubSubAuthenticatedApplicationApi, "BackendTwitchPubSubAuthenticatedApplicationApi")
        private readonly backendTwitchPubSubAuthenticatedApplicationApi: BackendTwitchPubSubAuthenticatedApplicationApi,
        @context(BackendTwitchIrcAuthenticatedApplicationApi, "BackendTwitchIrcAuthenticatedApplicationApi")
        private readonly backendTwitchIrcAuthenticatedApplicationApi: BackendTwitchIrcAuthenticatedApplicationApi,
        @context(BackendTwitchPollingAuthenticatedApplicationApi, "BackendTwitchPollingAuthenticatedApplicationApi")
        private readonly backendTwitchPollingAuthenticatedApplicationApi:
            BackendTwitchPollingAuthenticatedApplicationApi,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    public async start(): Promise<void> {
        const twitchIrcVidyCommandHandler = new TwitchIrcVidyCommandHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingSearchCommand,
        );
        const twitchIrcVidyResultEventHandler = new TwitchIrcVidyResultEventHandler(
            this.logger,
            this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.backendConfig.twitchChannelName,
            this.backendConfig.vidyVideoLinkBaseUrl,
        );

        const twitchIrcTextResponseCommandHandler = new TwitchIrcTextResponseCommandHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchIrcGreetingHandler = new TwitchIrcGreetingHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.twitchUserNameProvider,
        );
        const twitchIrcNewChatterHandler = new TwitchIrcNewChatterHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );
        const twitchIrcSubscribingHandler = new TwitchIrcSubscribingHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );
        const twitchIrcFollowReminderHandler = new TwitchIrcFollowReminderHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.backendConfig.twitchChannelName,
        );

        const twitchFollowingIrcReplyHandler = new TwitchFollowingIrcReplyHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchStreamingStatisticsCollector = new TwitchStreamingStatisticsCollectorHandler(
            this.logger,
            [
                this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent,
                this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            ],
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchCheeringWithCheermotesHandler = new TwitchCheeringWithCheermotesHandler(
            this.logger,
            [
                this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
                this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent,
            ],
            this.messageQueueTopicPublisherForIIncomingCheeringWithCheermotesEvent,
        );

        const twitchIncomingWhisperCommandEventTranslator = new IncomingWhisperCommandEventTranslator(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
            this.messageQueueTopicPublisherForIIncomingWhisperEvent,
        );
        const twitchWhisperIrcReplyHandler = new TwitchWhisperIrcReplyHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.backendConfig.twitchChannelName,
        );

        const twitchIncomingCheeringCommandEventTranslator = new IncomingCheeringCommandEventTranslator(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
            this.messageQueueTopicPublisherForIIncomingCheeringEvent,
        );
        const twitchCheeringIrcReplyHandler = new TwitchCheeringIrcReplyHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchIncomingSubscriptionCommandEventTranslator = new IncomingSubscriptionCommandEventTranslator(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIIncomingSubscriptionEvent,
            this.twitchUserNameProvider,
            this.twitchUserIdProvider,
        );
        const twitchSubscriptionIrcReplyHandler = new TwitchSubscriptionIrcReplyHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
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
            twitchUserId: await this.twitchUserIdProvider.get(),
            twitchUserName: await this.twitchUserNameProvider.get(),
        }, "Started listening to events");

        await Promise.all([
            this.backendTwitchPubSubAuthenticatedApplicationApi.start(),
            this.backendTwitchIrcAuthenticatedApplicationApi.start(),
            this.backendTwitchPollingAuthenticatedApplicationApi.start(),
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
