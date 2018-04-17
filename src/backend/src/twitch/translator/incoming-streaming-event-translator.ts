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

import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";

import IIncomingStreamingEvent from "@botten-nappet/interface-twitch/event/iincoming-streaming-event";

/* tslint:disable:max-line-length */

import IPollingStreamingResponse from "@botten-nappet/backend-twitch/interface/response/polling/istreaming-polling-response";
import IPollingConnection from "../polling/connection/ipolling-connection";
import PollingManager from "../polling/connection/polling-manager";

/* tslint:enable:max-line-length */

export default class IncomingStreamingCommandEventTranslator extends PollingManager<IPollingStreamingResponse> {
    constructor(
        logger: PinoLogger,
        connection: IPollingConnection<IPollingStreamingResponse>,
        private incomingStreamingEventEmitter: IEventEmitter<IIncomingStreamingEvent>,
        private username: string,
        private userid: number,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingStreamingEventEmitter, "object");
        assert.nonEmptyString(username);
        assert.integer(userid);
        assert.positive(userid);

        this.logger = logger.child(this.constructor.name);
    }

    protected async dataHandler(data: IPollingStreamingResponse): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        data.data.forEach((streamEvent) => {
            const userId = parseInt(streamEvent.user_id, 10);

            assert.equal(this.userid, userId);

            const event: IIncomingStreamingEvent = {
                channel: {
                    id: userId,
                    name: this.username,
                },
                startedAt: streamEvent.started_at,
                // TODO: move upwards in the object creation chain?
                timestamp: new Date(),
                title: streamEvent.title,
                type: streamEvent.type,
                viewers: streamEvent.viewer_count,
            };

            this.incomingStreamingEventEmitter.emit(event);
        });
    }

    protected async filter(data: IPollingStreamingResponse): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (typeof data !== "object") {
            return false;
        }

        if (!Array.isArray(data.data)) {
            return false;
        }

        return true;
    }
}
