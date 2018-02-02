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

import ConnectionManager from "../connection-manager";

const assert = require("power-assert");
const Promise = require("bluebird");

const axios = require("axios");

export default class ApplicationTokenManager extends ConnectionManager {
    constructor(logger, connection, clientId, revocationUri) {
        super(logger, connection);

        assert.strictEqual(arguments.length, 4);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof connection, "object");
        assert.strictEqual(typeof clientId, "string");
        assert(clientId.length > 0);
        assert.strictEqual(typeof revocationUri, "string");
        assert(revocationUri.length > 0);
        assert(revocationUri.startsWith("https://"));

        this._logger = logger.child("ApplicationTokenManager");
        this._clientId = clientId;
        this._revocationUri = revocationUri;

        this._revocationMethod = "post";
        this._revocationHeaders = {};

        this._rawToken = null;
        this._applicationAccessToken = null;

        this._tokenHasBeenSet = null;

        this._waitForFirstTokenPromise = new Promise((resolve, /* eslint-disable no-unused-vars */reject/* eslint-enable no-unused-vars */) => {
            const waitForToken = () => {
                resolve();
            };

            this._tokenHasBeenSet = waitForToken;
        })
            .then(() => {
                this._logger.info("Received first token.", "_waitForFirstTokenPromise");

                return undefined;
            });
    }

    async start() {
        assert.strictEqual(arguments.length, 0);

        await super.start();
        return this._connection.force(true);
    }

    async stop() {
        assert.strictEqual(arguments.length, 0);

        await this._revokeTokenIfSet(this._applicationAccessToken);
        return super.stop();
    }

    async _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        this._logger.trace(data, "_dataHandler");

        return Promise.all([
            this._revokeTokenIfSet(this._applicationAccessToken),
            this._setToken(data),
        ]);
    }

    async _filter(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        if (typeof data !== "object") {
            return false;
        }

        if (typeof data.access_token !== "string") {
            return false;
        }

        return true;
    }

    async _setToken(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        this._rawToken = data;
        this._applicationAccessToken = data.access_token;

        await this._tokenHasBeenSet();

        return undefined;
    }

    async _sendRevocation(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        const axiosInstanceConfig = {
            baseURL: this._revocationUri,
            // NOTE: per-instance method has no effect due to bug in axios, must use per request.
            // TODO: remove per-call overrides once axios has been fixed.
            // https://github.com/axios/axios/issues/723
            method: this._revocationMethod,
            headers: this._revocationHeaders,
            data: data,
        };

        const axiosInstance = axios.create(axiosInstanceConfig);

        const response = await axiosInstance.request({
            // NOTE: per-instance method has no effect due to bug in axios, must use per request.
            // TODO: remove per-call overrides once axios has been fixed.
            // https://github.com/axios/axios/issues/723
            method: this._revocationMethod,
        });

        return response;
    }

    async _revokeToken(token) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof token, "string");
        assert(token.length > 0);

        const data = {
            client_id: this._clientId,
            token: token,
        };

        this._logger.trace(data, "_revokeToken");

        return this._sendRevocation(data);
    }

    async _revokeTokenIfSet(token) {
        assert.strictEqual(arguments.length, 1);

        if (typeof token === "string") {
            return this._revokeToken(token);
        }

        return undefined;
    }

    async get() {
        assert.strictEqual(arguments.length, 0);

        return this._applicationAccessToken;
    }

    async getOrWait() {
        assert.strictEqual(arguments.length, 0);

        await this._waitForFirstTokenPromise;

        return this.get();
    }
}
