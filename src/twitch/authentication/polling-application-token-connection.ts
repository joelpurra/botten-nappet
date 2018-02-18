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

import PinoLogger from "../../util/pino-logger";
import IHttpData from "../polling/ihttp-data";
import IHttpHeaders from "../polling/ihttp-header";
import PollingConnection from "../polling/polling-connection";
import IRawToken from "./iraw-token";

export default class PollingApplicationTokenConnection extends PollingConnection<IRawToken, void> {
    public _scopes: string[];
    public _applicationClientSecret: string;
    public _applicationClientId: string;
    constructor(
        logger: PinoLogger,
        applicationClientId: string,
        applicationClientSecret: string,
        scopes: string[],
        interval: number,
        atBegin: boolean,
        uri: string,
        method: string,
        defaultHeaders?: IHttpHeaders,
        defaultData?: IHttpData,
    ) {
        super(logger, interval, atBegin, uri, method, defaultHeaders, defaultData);

        assert(arguments.length === 7 || arguments.length === 8 || arguments.length === 9);
        assert.equal(typeof logger, "object");
        assert.equal(typeof applicationClientId, "string");
        assert.greater(applicationClientId.length, 0);
        assert.equal(typeof applicationClientSecret, "string");
        assert.greater(applicationClientSecret.length, 0);
        assert(!isNaN(interval));
        assert.greater(interval, 0);
        assert.equal(typeof atBegin, "boolean");
        assert.equal(typeof uri, "string");
        assert.greater(uri.length, 0);
        assert(uri.startsWith("https://"));
        assert.equal(typeof method, "string");
        assert.greater(method.length, 0);
        assert(typeof defaultHeaders === "undefined" || typeof defaultHeaders === "object");
        assert(typeof defaultData === "undefined" || typeof defaultData === "object");
        assert(Array.isArray(scopes));

        // super._getHeaders = this._getHeaders.bind(this);
        // super._getData = this._getData.bind(this);

        this._logger = logger.child("PollingApplicationTokenConnection");
        this._applicationClientId = applicationClientId;
        this._applicationClientSecret = applicationClientSecret;
        this._scopes = scopes;
    }

    public async _getHeaders() {
        assert.hasLength(arguments, 0);

        const headers = {};

        return headers;
    }

    public async _getData() {
        assert.hasLength(arguments, 0);

        const data = {
            client_id: this._applicationClientId,
            client_secret: this._applicationClientSecret,
            grant_type: "client_credentials",
            scope: this._scopes.join(" "),
        };

        return data;
    }
}