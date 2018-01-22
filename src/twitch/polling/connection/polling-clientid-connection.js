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

import PollingConnection from "../polling-connection";

const assert = require("power-assert");
const Promise = require("bluebird");

export default class PollingClientIdConnection extends PollingConnection {
    constructor(logger, applicationClientId, interval, atBegin, uri, method, defaultHeaders, defaultData) {
        super(logger, interval, atBegin, uri, method, defaultHeaders, defaultData);

        assert(arguments.length === 6 || arguments.length === 7 || arguments.length === 8);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof applicationClientId, "string");
        assert(applicationClientId.length > 0);
        assert(!isNaN(interval));
        assert(interval > 0);
        assert.strictEqual(typeof atBegin, "boolean");
        assert.strictEqual(typeof uri, "string");
        assert(uri.length > 0);
        assert(uri.startsWith("https://"));
        assert.strictEqual(typeof method, "string");
        assert(method.length > 0);
        assert(typeof defaultHeaders === "undefined" || typeof defaultHeaders === "object");
        assert(typeof defaultData === "undefined" || typeof defaultData === "object");

        super._getHeaders = this._getHeaders.bind(this);
        super._getData = this._getData.bind(this);

        this._logger = logger.child("PollingClientIdConnection");
        this._applicationClientId = applicationClientId;
    }

    _getHeaders() {
        assert.strictEqual(arguments.length, 0);

        return Promise.try(() => {
            const headers = {
                Accept: "application/vnd.twitchtv.v5+json",
                "Client-ID": `${this._applicationClientId}`,
            };

            return headers;
        });
    }

    _getData() {
        assert.strictEqual(arguments.length, 0);

        return Promise.try(() => {
            const data = {};

            return data;
        });
    }
}
