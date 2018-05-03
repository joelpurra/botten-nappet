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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";

import IIncomingCheermotesEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheermotes-event";

/* tslint:disable:max-line-length */

import IPollingCheermotesResponse from "../interface/response/polling/icheermotes-polling-response";
import IPollingConnection from "../polling/connection/ipolling-connection";
import PollingManager from "../polling/connection/polling-manager";

/* tslint:enable:max-line-length */

export default class IncomingCheermotesCommandEventTranslator extends PollingManager<IPollingCheermotesResponse> {
    constructor(
        logger: PinoLogger,
        connection: IPollingConnection<IPollingCheermotesResponse>,
        private incomingCheermotesEventEmitter: IEventEmitter<IIncomingCheermotesEvent>,
        private readonly username: string,
        private readonly userid: number,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingCheermotesEventEmitter, "object");
        assert.nonEmptyString(username);
        assert.integer(userid);
        assert.positive(userid);

        this.logger = logger.child(this.constructor.name);
    }

    protected async dataHandler(data: IPollingCheermotesResponse): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const event: IIncomingCheermotesEvent = {
            channel: {
                id: this.userid,
                name: this.username,
            },
            cheermotes: data,
            // TODO: move upwards in the object creation chain?
            timestamp: new Date(),
        };

        this.incomingCheermotesEventEmitter.emit(event);
    }

    protected async filter(data: IPollingCheermotesResponse): Promise<boolean> {
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
