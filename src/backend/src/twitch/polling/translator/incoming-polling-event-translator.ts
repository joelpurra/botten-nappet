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

import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import IPollingConnection from "../connection/ipolling-connection";
import PollingManager from "../connection/polling-manager";
import IIncomingPollingEvent from "../interface/iincoming-polling-event";

export default class IncomingPollingEventTranslator extends PollingManager<any> {
    constructor(
        logger: PinoLogger,
        connection: IPollingConnection<any>,
        private incomingPollingEventEmitter: IEventEmitter<IIncomingPollingEvent>,
        private readonly username: string,
        private readonly userid: number,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingPollingEventEmitter, "object");
        assert.nonEmptyString(username);
        assert.integer(userid);
        assert.positive(userid);

        this.logger = logger.child(this.constructor.name);
    }

    protected async dataHandler(data: any): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const event: IIncomingPollingEvent = {
            channel: {
                id: this.userid,
                name: this.username,
            },
            data,
            // TODO: move upwards in the object creation chain?
            timestamp: new Date(),
        };

        this.incomingPollingEventEmitter.emit(event);
    }

    protected async filter(data: any): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (typeof data !== "object") {
            return false;
        }

        if (!Array.isArray(data.actions)) {
            return false;
        }

        return true;
    }
}
