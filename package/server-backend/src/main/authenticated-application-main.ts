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
import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import IncomingCheeringEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-cheering-event-single-item-json-topics-subscriber";
import IncomingCheermotesEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-cheermotes-event-single-item-json-topics-subscriber";
import IncomingFollowingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-following-event-single-item-json-topics-subscriber";
import IncomingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-irc-command-single-item-json-topics-subscriber";
import IncomingPubSubEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-pub-sub-event-single-item-json-topics-subscriber";
import IncomingSearchResultEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-search-result-event-single-item-json-topics-subscriber";
import IncomingStreamingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-streaming-event-single-item-json-topics-subscriber";
import IncomingSubscriptionEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-subscription-event-single-item-json-topics-subscriber";
import IncomingWhisperEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-whisper-event-single-item-json-topics-subscriber";

import PerUserHandlersMain from "./per-user-handlers-main";

/* tslint:enable:max-line-length */

export default class BackendAuthenticatedApplicationMain implements IStartableStoppable {
    private connectables: IConnectable[];
    private logger: PinoLogger;

    constructor(
        @context(PerUserHandlersMain, "PerUserHandlersMain")
        private readonly perUserHandlersMain: () => PerUserHandlersMain,
        logger: PinoLogger,
        @scoped(IncomingPubSubEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent:
            IncomingPubSubEventSingleItemJsonTopicsSubscriber,
        @scoped(IncomingIrcCommandSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
            IncomingIrcCommandSingleItemJsonTopicsSubscriber,
        @scoped(IncomingFollowingEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent:
            IncomingFollowingEventSingleItemJsonTopicsSubscriber,
        @scoped(IncomingStreamingEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent:
            IncomingStreamingEventSingleItemJsonTopicsSubscriber,
        @scoped(IncomingCheermotesEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent:
            IncomingCheermotesEventSingleItemJsonTopicsSubscriber,
        @scoped(IncomingCheeringEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent:
            IncomingCheeringEventSingleItemJsonTopicsSubscriber,
        @scoped(IncomingWhisperEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent:
            IncomingWhisperEventSingleItemJsonTopicsSubscriber,
        @scoped(IncomingSubscriptionEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent:
            IncomingSubscriptionEventSingleItemJsonTopicsSubscriber,
        @scoped(IncomingSearchResultEventSingleItemJsonTopicsSubscriber)
        private readonly vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent:
            IncomingSearchResultEventSingleItemJsonTopicsSubscriber,
    ) {
        assert.hasLength(arguments, 11);
        assert.equal(typeof perUserHandlersMain, "function");
        assert.equal(typeof logger, "object");
        assert.equal(typeof twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent, "object");
        assert.equal(typeof twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand, "object");
        assert.equal(typeof twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent, "object");
        assert.equal(typeof twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent, "object");
        assert.equal(typeof twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent, "object");
        assert.equal(typeof twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent, "object");
        assert.equal(typeof twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent, "object");
        assert.equal(typeof twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent, "object");
        assert.equal(typeof vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent, "object");

        this.logger = logger.child(this.constructor.name);

        this.connectables = [];
    }

    public async start(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.hasLength(this.connectables, 0);

        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingPubSubEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingStreamingEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheermotesEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingWhisperEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent);
        this.connectables.push(this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        await this.perUserHandlersMain().start();
    }

    public async  stop(): Promise<void> {
        assert.hasLength(arguments, 0);

        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.perUserHandlersMain) {
            this.perUserHandlersMain().stop();
        }

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
