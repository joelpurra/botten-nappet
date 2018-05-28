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

import IIncomingWhisperEvent,
{
    WhisperType,
} from "@botten-nappet/interface-shared-twitch/src/event/iincoming-whisper-event";

/* tslint:disable:max-line-length */

import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";
import IIncomingPubSubEvent from "@botten-nappet/interface-backend-twitch/src/event/iincoming-pub-sub-event";
import IPubSubResponse from "@botten-nappet/interface-backend-twitch/src/event/ipubsub-response";
import IncomingWhisperEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-incoming-whisper-event-topic-publisher";
import IncomingPubSubEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-incoming-pub-sub-event-single-item-json-topics-subscriber";

/* tslint:enable:max-line-length */

@asrt(4)
export default class IncomingWhisperCommandEventTranslator extends EventSubscriptionManager<IIncomingPubSubEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IncomingPubSubEventSingleItemJsonTopicsSubscriber,
        @asrt() private readonly incomingWhisperEventEmitter: IncomingWhisperEventTopicPublisher,
        @asrt() private readonly applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IPubSubResponse,
    ): Promise<void> {
        const whisperEventOwner = parseInt(data.data!.topic.replace("whispers.", ""), 10);
        const whisperEvent: any = data.data!.messageParsed.data_object;
        const whisperType = this.getWhisperType(whisperEventOwner, whisperEvent.from_id, whisperEvent.recipient.id);

        const event: IIncomingWhisperEvent = {
            application: {
                // TODO: create a class/builder for the twitch application object.
                id: this.applicationTokenManagerConfig.appClientId,
                name: "twitch",
            },
            data: {
                id: whisperEvent.id,
                message: whisperEvent.body,
                timestamp: new Date(whisperEvent.sent_ts),
                type: whisperType,
            },
            recipient: {
                id: whisperEvent.recipient.id,
                name: whisperEvent.recipient.username,
            },
            sender: {
                id: whisperEvent.from_id,
                name: whisperEvent.tags.login,
            },
            timestamp: new Date(),
        };

        this.incomingWhisperEventEmitter.emit(event);
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
