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

import PinoLogger from "../../../util/pino-logger";
import IHttpData from "../ihttp-data";
import IHttpHeaders from "../ihttp-header";
import PollingConnection from "../polling-connection";

export default class PollingClientIdConnection extends PollingConnection<any, void> {
    public _applicationClientId: string;

    constructor(
        logger: PinoLogger,
        applicationClientId: string,
        interval: number,
        atBegin: boolean,
        uri: string,
        method: string,
        defaultHeaders?: IHttpHeaders,
        defaultData?: IHttpData,
    ) {
        super(logger, interval, atBegin, uri, method, defaultHeaders, defaultData);

        assert(arguments.length === 6 || arguments.length === 7 || arguments.length === 8);
        assert.equal(typeof logger, "object");
        assert.equal(typeof applicationClientId, "string");
        assert.greater(applicationClientId.length, 0);
        assert.number(interval);
        assert.greater(interval, 0);
        assert.equal(typeof atBegin, "boolean");
        assert.equal(typeof uri, "string");
        assert.greater(uri.length, 0);
        assert(uri.startsWith("https://"));
        assert.equal(typeof method, "string");
        assert.greater(method.length, 0);
        assert(typeof defaultHeaders === "undefined" || typeof defaultHeaders === "object");
        assert(typeof defaultData === "undefined" || typeof defaultData === "object");

        // super._getHeaders = this._getHeaders.bind(this);
        // super._getData = this._getData.bind(this);

        this._logger = logger.child("PollingClientIdConnection");
        this._applicationClientId = applicationClientId;
    }

    public async _getHeaders(): Promise<IHttpHeaders> {
        assert.hasLength(arguments, 0);

        const headers = {
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": `${this._applicationClientId}`,
        };

        return headers;
    }

    public async _getData(): Promise<IHttpData> {
        assert.hasLength(arguments, 0);

        const data = {};

        return data;
    }
}