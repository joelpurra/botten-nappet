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
    asrt,
} from "@botten-nappet/shared/src/util/asrt";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";

import IIncomingCheeringEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheering-event";

/* tslint:disable:max-line-length */

import IIncomingPubSubEvent from "@botten-nappet/interface-backend-twitch/src/event/iincoming-pub-sub-event";
import IPubSubResponse from "@botten-nappet/interface-backend-twitch/src/event/ipubsub-response";
import IncomingCheeringEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-cheering-event-topic-publisher";
import IncomingPubSubEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-pub-sub-event-single-item-json-topics-subscriber";

/* tslint:enable:max-line-length */

@asrt(3)
export default class IncomingCheeringCommandEventTranslator extends EventSubscriptionManager<IIncomingPubSubEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IncomingPubSubEventSingleItemJsonTopicsSubscriber,
        @asrt() private readonly incomingCheeringEventEmitter: IncomingCheeringEventTopicPublisher,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IPubSubResponse,
    ): Promise<void> {
        // TODO: create type/interface for bits.
        const bitsEvent: any = data.data!.messageParsed.data;

        const event: IIncomingCheeringEvent = {
            badge: bitsEvent.badge_entitlement,
            bits: bitsEvent.bits_used,
            channel: {
                id: bitsEvent.channel_id,
                name: bitsEvent.channel_name,
            },
            message: bitsEvent.chat_message,
            timestamp: data.timestamp,
            total: bitsEvent.total_bits_used,
            triggerer: {
                id: bitsEvent.user_id,
                name: bitsEvent.user_name,
            },
        };

        this.incomingCheeringEventEmitter.emit(event);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IPubSubResponse,
    ): Promise<boolean> {
        if (typeof data !== "object") {
            return false;
        }

        if (data.type !== "MESSAGE") {
            return false;
        }

        if (typeof data.data !== "object") {
            return false;
        }

        if (typeof data.data.topic !== "string") {
            return false;
        }

        if (!data.data.topic.startsWith("channel-bits-events-v1.")) {
            return false;
        }

        return true;
    }
}
