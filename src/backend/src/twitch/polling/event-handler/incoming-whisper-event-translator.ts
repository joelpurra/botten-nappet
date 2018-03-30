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
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/event/event-subscription-manager";
import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/event/ievent-subscription-connection";

import IIncomingWhisperEvent,
{
    WhisperType,
} from "@botten-nappet/interface-twitch/event/iincoming-whisper-event";

import IPubSubResponse from "../../pubsub/ipubsub-response";
import IIncomingPubSubEvent from "../event/iincoming-pubsub-event";

export default class IncomingWhisperCommandEventTranslator extends EventSubscriptionManager<IIncomingPubSubEvent> {
    private incomingWhisperEventEmitter: IEventEmitter<IIncomingWhisperEvent>;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingPubSubEvent>,
        incomingWhisperEventEmitter: IEventEmitter<IIncomingWhisperEvent>,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingWhisperEventEmitter, "object");

        this.logger = logger.child("IncomingWhisperCommandEventTranslator");
        this.incomingWhisperEventEmitter = incomingWhisperEventEmitter;
    }

    protected async dataHandler(data: IPubSubResponse): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const whisperEventOwner = parseInt(data.data!.topic.replace("whispers.", ""), 10);
        const whisperEvent: any = data.data!.messageParsed.data_object;
        const whisperType = this.getWhisperType(whisperEventOwner, whisperEvent.from_id, whisperEvent.recipient.id);

        const event: IIncomingWhisperEvent = {
            id: whisperEvent.id,
            message: whisperEvent.body,
            recipient: {
                id: whisperEvent.recipient.id,
                name: whisperEvent.recipient.username,
            },
            sender: {
                id: whisperEvent.from_id,
                name: whisperEvent.tags.login,
            },
            timestamp: new Date(whisperEvent.sent_ts),
            type: whisperType,
        };

        this.incomingWhisperEventEmitter.emit(event);
    }

    protected async filter(data: IPubSubResponse): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

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

        if (!data.data.topic.startsWith("whispers.")) {
            return false;
        }

        // NOTE: ignore spam info whispers.
        if (data.data.messageParsed.data_object.spam_info) {
            return false;
        }

        return true;
    }

    private getWhisperType(whisperEventOwner: number, fromId: number, recipientId: number): WhisperType {
        let result: (WhisperType | null) = null;

        if (whisperEventOwner === fromId) {
            result = "sent";
        } else if (whisperEventOwner === recipientId) {
            result = "received";
        } else {
            const msg = `PubSub whisper event owner does not match sender nor recipient: ${
                whisperEventOwner
                }, ${
                fromId
                }, ${
                recipientId
                }.`;

            throw new Error(msg);
        }

        return result;
    }
}
