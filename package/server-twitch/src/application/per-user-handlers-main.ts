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
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
import Bluebird from "bluebird";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
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
import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";

import IncomingCheeringEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-incoming-cheering-event-topic-publisher";
import IncomingCheeringWithCheermotesEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-incoming-cheering-with-cheermotes-event-topic-publisher";
import IncomingSubscriptionEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-incoming-subscription-event-topic-publisher";
import IncomingWhisperEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-incoming-whisper-event-topic-publisher";
import OutgoingIrcCommandTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-outgoing-irc-command-topic-publisher";
import OutgoingSearchCommandTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/vidy-outgoing-search-command-topic-publisher";

import IncomingCheeringEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-cheering-event-single-item-json-topics-subscriber";
import IncomingCheermotesEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-cheermotes-event-single-item-json-topics-subscriber";
import IncomingFollowingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-following-event-single-item-json-topics-subscriber";
import IncomingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-irc-command-single-item-json-topics-subscriber";
import IncomingPubSubEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-pub-sub-event-single-item-json-topics-subscriber";
import IncomingStreamingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-streaming-event-single-item-json-topics-subscriber";
import IncomingSubscriptionEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-subscription-event-single-item-json-topics-subscriber";
import IncomingWhisperEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-whisper-event-single-item-json-topics-subscriber";
import IncomingSearchResultEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/vidy-incoming-search-result-event-single-item-json-topics-subscriber";

import BackendTwitchIrcAuthenticatedApplicationApi from "@botten-nappet/server-twitch/src/irc/irc-authenticated-application-api";
import BackendTwitchPollingAuthenticatedApplicationApi from "@botten-nappet/server-twitch/src/polling/polling-authenticated-application-api";
import BackendTwitchPubSubAuthenticatedApplicationApi from "@botten-nappet/server-twitch/src/pubsub/pubsub-authenticated-application-api";

/* tslint:enable max-line-length */

@asrt(23)
export default class PerUserHandlersMain implements IStartableStoppable {
    private startables: IStartableStoppable[] = [];
    private logger: PinoLogger;

    constructor(
        @asrt()
        @context(BackendTwitchPubSubAuthenticatedApplicationApi, "BackendTwitchPubSubAuthenticatedApplicationApi")
        private readonly backendTwitchPubSubAuthenticatedApplicationApi:
            () => BackendTwitchPubSubAuthenticatedApplicationApi,
        @asrt()
        @context(BackendTwitchIrcAuthenticatedApplicationApi, "BackendTwitchIrcAuthenticatedApplicationApi")
        private readonly backendTwitchIrcAuthenticatedApplicationApi:
            () => BackendTwitchIrcAuthenticatedApplicationApi,
        @asrt()
        @context(BackendTwitchPollingAuthenticatedApplicationApi, "BackendTwitchPollingAuthenticatedApplicationApi")
        private readonly backendTwitchPollingAuthenticatedApplicationApi:
            () => BackendTwitchPollingAuthenticatedApplicationApi,
        @asrt() private readonly backendConfig: BackendConfig,
        @asrt() logger: PinoLogger,
        @asrt() @scoped(OutgoingIrcCommandTopicPublisher)
        private readonly messageQueueTopicPublisherForIOutgoingIrcCommand:
            OutgoingIrcCommandTopicPublisher,
        @asrt() @scoped(IncomingCheeringEventTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingCheeringEvent:
            IncomingCheeringEventTopicPublisher,
        @asrt() @scoped(IncomingWhisperEventTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingWhisperEvent:
            IncomingWhisperEventTopicPublisher,
        @asrt() @scoped(IncomingSubscriptionEventTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingSubscriptionEvent:
            IncomingSubscriptionEventTopicPublisher,
        @asrt() @scoped(IncomingCheeringWithCheermotesEventTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingCheeringWithCheermotesEvent:
            IncomingCheeringWithCheermotesEventTopicPublisher,
        @asrt() @scoped(OutgoingSearchCommandTopicPublisher)
        private readonly messageQueueTopicPublisherForIOutgoingSearchCommand:
            OutgoingSearchCommandTopicPublisher,
        @asrt() @scoped(IncomingPubSubEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent:
            IncomingPubSubEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingIrcCommandSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
            IncomingIrcCommandSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingFollowingEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent:
            IncomingFollowingEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingStreamingEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent:
            IncomingStreamingEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingCheermotesEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent:
            IncomingCheermotesEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingCheeringEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent:
            IncomingCheeringEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingWhisperEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent:
            IncomingWhisperEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingSubscriptionEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent:
            IncomingSubscriptionEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingSearchResultEventSingleItemJsonTopicsSubscriber)
        private readonly vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent:
            IncomingSearchResultEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(TwitchUserNameProvider)
        private readonly twitchUserNameProvider: TwitchUserNameProvider,
        @asrt() @scoped(TwitchUserIdProvider)
        private readonly twitchUserIdProvider: TwitchUserIdProvider,
        @asrt() private readonly applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async start(): Promise<void> {

        this.logger.info("Starting.");

        const twitchIrcVidyCommandHandler = new TwitchIrcVidyCommandHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
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
            this.messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchIrcGreetingHandler = new TwitchIrcGreetingHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.twitchUserNameProvider,
        );
        const twitchIrcNewChatterHandler = new TwitchIrcNewChatterHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );
        const twitchIrcSubscribingHandler = new TwitchIrcSubscribingHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );
        const twitchIrcFollowReminderHandler = new TwitchIrcFollowReminderHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.backendConfig.twitchChannelName,
        );

        const twitchFollowingIrcReplyHandler = new TwitchFollowingIrcReplyHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchStreamingStatisticsCollector = new TwitchStreamingStatisticsCollectorHandler(
            this.logger,
            [
                this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent,
                this.messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            ],
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchCheeringWithCheermotesHandler = new TwitchCheeringWithCheermotesHandler(
            this.logger,
            [
                this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
                this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent,
            ],
            this.messageQueueTopicPublisherForIIncomingCheeringWithCheermotesEvent,
            this.applicationTokenManagerConfig,
        );

        const twitchIncomingWhisperCommandEventTranslator = new IncomingWhisperCommandEventTranslator(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
            this.messageQueueTopicPublisherForIIncomingWhisperEvent,
            this.applicationTokenManagerConfig,
        );
        const twitchWhisperIrcReplyHandler = new TwitchWhisperIrcReplyHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
            this.backendConfig.twitchChannelName,
        );

        const twitchIncomingCheeringCommandEventTranslator = new IncomingCheeringCommandEventTranslator(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent,
            this.messageQueueTopicPublisherForIIncomingCheeringEvent,
            this.applicationTokenManagerConfig,
        );
        const twitchCheeringIrcReplyHandler = new TwitchCheeringIrcReplyHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent,
            this.messageQueueTopicPublisherForIOutgoingIrcCommand,
        );

        const twitchIncomingSubscriptionCommandEventTranslator = new IncomingSubscriptionCommandEventTranslator(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            this.messageQueueTopicPublisherForIIncomingSubscriptionEvent,
            this.twitchUserNameProvider,
            this.twitchUserIdProvider,
            this.applicationTokenManagerConfig,
        );
        const twitchSubscriptionIrcReplyHandler = new TwitchSubscriptionIrcReplyHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent,
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

        await Bluebird.map(this.startables, async (startable) => await startable.start());

        this.logger.info({
            twitchUserId: await this.twitchUserIdProvider.get(),
            twitchUserName: await this.twitchUserNameProvider.get(),
        }, "Started listening to events");

        await Promise.all([
            this.backendTwitchPubSubAuthenticatedApplicationApi().start(),
            this.backendTwitchIrcAuthenticatedApplicationApi().start(),
            this.backendTwitchPollingAuthenticatedApplicationApi().start(),
        ]);
    }

    @asrt(0)
    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.backendTwitchPubSubAuthenticatedApplicationApi) {
            await this.backendTwitchPubSubAuthenticatedApplicationApi().stop();
        }

        if (this.backendTwitchIrcAuthenticatedApplicationApi) {
            await this.backendTwitchIrcAuthenticatedApplicationApi().stop();
        }

        if (this.backendTwitchPollingAuthenticatedApplicationApi) {
            await this.backendTwitchPollingAuthenticatedApplicationApi().stop();
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
