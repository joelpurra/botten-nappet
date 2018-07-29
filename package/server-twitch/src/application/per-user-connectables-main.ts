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
    scoped,
} from "@botten-nappet/backend-shared/lib/dependency-injection/scoped/scoped";
import {
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
import Bluebird from "bluebird";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import TwitchUserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import TwitchUserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";

import IncomingCheeringEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-cheering-event-single-item-json-topics-subscriber";
import IncomingCheermotesEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-cheermotes-event-single-item-json-topics-subscriber";
import IncomingFollowingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-following-event-single-item-json-topics-subscriber";
import IncomingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-irc-command-single-item-json-topics-subscriber";
import IncomingPubSubEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-pub-sub-event-single-item-json-topics-subscriber";
import IncomingStreamingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-streaming-event-single-item-json-topics-subscriber";
import IncomingSubscriptionEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-subscription-event-single-item-json-topics-subscriber";
import IncomingWhisperEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-whisper-event-single-item-json-topics-subscriber";
import IncomingSearchResultEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/vidy-incoming-search-result-event-single-item-json-topics-subscriber";

/* tslint:enable max-line-length */

@asrt(12)
export default class PerUserHandlersMain implements IStartableStoppable {
    private connectables: IConnectable[] = [];
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
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
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async start(): Promise<void> {

        this.logger.info("Starting.");

        // TODO: dependency injection with automatic stateful initialization, such as connecting/starting?
        this.connectables.push(this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent);
        this.connectables.push(this.messageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand);
        this.connectables.push(this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent);
        this.connectables.push(this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent);
        this.connectables.push(this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent);
        this.connectables.push(this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent);
        this.connectables.push(this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent);
        this.connectables.push(this.messageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent);

        this.connectables.push(this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info({
            twitchUserId: await this.twitchUserIdProvider.get(),
            twitchUserName: await this.twitchUserNameProvider.get(),
        }, "Connected.");
    }

    @asrt(0)
    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
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
