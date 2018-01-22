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

const assert = require("power-assert");
const Promise = require("bluebird");

const axios = require("axios");

export default class PollingConnection {
    constructor(logger, interval, uri, method, defaultHeaders, defaultData) {
        assert(arguments.length === 4 || arguments.length === 5 || arguments.length === 6);
        assert.strictEqual(typeof logger, "object");
        assert(!isNaN(interval));
        assert(interval > 0);
        assert.strictEqual(typeof uri, "string");
        assert(uri.length > 0);
        assert(uri.startsWith("https://"));
        assert.strictEqual(typeof method, "string");
        assert(method.length > 0);
        assert(typeof defaultHeaders === "undefined" || typeof defaultHeaders === "object");
        assert(typeof defaultData === "undefined" || typeof defaultData === "object");

        this._logger = logger.child("PollingConnection");
        this._interval = interval;
        this._uri = uri;
        this._method = method;
        this._defaultHeaders = defaultHeaders;
        this._defaultData = defaultData;

        this._methods = [
            "get",
            "delete",
            "head",
            "options",
            "post",
            "put",
            "patch",
        ];

        assert(this._methods.includes(this._method));

        this._intervalMinMilliseconds = 10 * 1000;

        assert(this._interval >= this._intervalMinMilliseconds);

        this._axios = null;
        this._intervalId = null;
        this._dataHandlers = [];
    }

    _getAllHeaders() {
        assert.strictEqual(arguments.length, 0);

        return Promise.try(() => {
            return this._getHeaders()
                .then((overriddenHeaders) => {
                    const headers = {
                        ...this._defaultHeaders,
                        ...overriddenHeaders,
                    };

                    return headers;
                });
        });
    }

    _getHeaders() {
        assert.fail("Method should be overwritten.");
    }

    _getAllData() {
        assert.strictEqual(arguments.length, 0);

        return Promise.try(() => {
            return this._getData()
                .then((overriddenData) => {
                    const data = {
                        ...this._defaultData,
                        ...overriddenData,
                    };

                    return data;
                });
        });
    }

    _getData() {
        assert.fail("Method should be overwritten.");
    }

    connect() {
        assert.strictEqual(arguments.length, 0);
        assert.strictEqual(this._axios, null);
        assert.strictEqual(this._intervalId, null);

        return Promise.all([
            this._getAllHeaders(),
            this._getAllData(),
        ])
            .then(([headers, data]) => {
                const axiosInstanceConfig = {
                    baseURL: this._uri,
                    method: this._method,
                    headers: headers,
                    data: data,
                };

                this._axios = axios.create(axiosInstanceConfig);

                this._intervalId = setInterval(this._poll.bind(this), this._interval);

                return undefined;
            });
    }

    disconnect() {
        assert.notStrictEqual(this._axios, null);
        assert.notStrictEqual(this._intervalId, null);

        return Promise.try(() => {
            clearInterval(this._intervalId);

            this._intervalId = null;
            this._axios = null;
        });
    }

    _poll() {
        assert.strictEqual(arguments.length, 0);

        return Promise.resolve(this._axios.request())
            .tap((response) => {
                this._logger.trace(response.data, response.status, response.statusText, "_poll");
            })
            .get("data")
            .then((data) => {
                // TODO: try-catch for bad handlers.
                return this._dataHandler(data);
            })
            .catch((error) => {
                this._logger.error(error, "Masking polling error", "_poll");

                return undefined;
            });
    };

    _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);

        return Promise.filter(
            this._dataHandlers,
            (dataHandler) => Promise.resolve(dataHandler.filter(data))
                .then((shouldHandle) => {
                    if (shouldHandle !== true) {
                        return false;
                    }

                    return Promise.resolve(dataHandler.handler(data));
                })
                .then(() => undefined, (error) => {
                    this._logger.warn(error, `Masking error in dataHandler ${dataHandler.handler.name}`);

                    return undefined;
                })
        );
    }

    listen(handler, filter) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof handler, "function");
        assert.strictEqual(typeof filter, "function");

        return Promise.try(() => {
            const dataHandler = {
                handler: handler,
                filter: filter,
            };

            this._dataHandlers.push(dataHandler);

            const killSwitch = () => {
                this._dataHandlers = this._dataHandlers.filter((_dataHandler) => _dataHandler !== dataHandler);
            };

            return killSwitch;
        });
    }
}
