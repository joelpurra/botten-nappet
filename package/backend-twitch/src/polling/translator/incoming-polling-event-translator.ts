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
import {
    assert,
} from "check-types";

import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IIncomingPollingEvent from "@botten-nappet/interface-backend-twitch/src/event/iincoming-polling-event";

import IPollingConnection from "../connection/ipolling-connection";
import PollingManager from "../connection/polling-manager";

@asrt(5)
export default class IncomingPollingEventTranslator extends PollingManager<any> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IPollingConnection<any>,
        @asrt() private incomingPollingEventEmitter: IEventEmitter<IIncomingPollingEvent>,
        @asrt() private readonly username: string,
        @asrt() private readonly userid: number,
    ) {
        super(logger, connection);

        assert.nonEmptyString(username);
        assert.integer(userid);
        assert.positive(userid);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: any,
    ): Promise<void> {
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

    @asrt(1)
    protected async filter(
        @asrt() data: any,
    ): Promise<boolean> {
        if (typeof data !== "object") {
            return false;
        }

        if (!Array.isArray(data.actions)) {
            return false;
        }

        return true;
    }
}
