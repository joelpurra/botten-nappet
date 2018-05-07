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

import IHttpData from "@botten-nappet/interface-backend-twitch/src/event/ihttp-data";
import IHttpHeaders from "@botten-nappet/interface-backend-twitch/src/event/ihttp-header";

import PollingConnection from "./polling-connection";

export default abstract class PollingClientIdConnection<T> extends PollingConnection<T> {
    constructor(
        logger: PinoLogger,
        private readonly applicationClientId: string,
        interval: number,
        atBegin: boolean,
        method: string,
        defaultHeaders?: IHttpHeaders,
        defaultData?: IHttpData,
    ) {
        super(logger, interval, atBegin, method, defaultHeaders, defaultData);

        assert(arguments.length === 5 || arguments.length === 6 || arguments.length === 7);
        assert.equal(typeof logger, "object");
        assert.equal(typeof applicationClientId, "string");
        assert.greater(applicationClientId.length, 0);
        assert.number(interval);
        assert.greater(interval, 0);
        assert.equal(typeof atBegin, "boolean");
        assert.equal(typeof method, "string");
        assert.greater(method.length, 0);
        assert(typeof defaultHeaders === "undefined" || typeof defaultHeaders === "object");
        assert(typeof defaultData === "undefined" || typeof defaultData === "object");

        this.logger = logger.child(this.constructor.name);
    }

    protected async getHeaders(): Promise<IHttpHeaders> {
        assert.hasLength(arguments, 0);

        const headers = {
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": `${this.applicationClientId}`,

            // NOTE: required to get large (chunked) responses from the twitch api.
            "Connection": "keep-alive",
        };

        return headers;
    }

    protected async getData(): Promise<IHttpData> {
        assert.hasLength(arguments, 0);

        const data = {};

        return data;
    }
}
