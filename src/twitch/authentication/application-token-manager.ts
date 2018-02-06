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

import axios from "axios";

import PinoLogger from "../../util/pino-logger";
import ConnectionManager from "../connection-manager";
import IConnection from "../iconnection";
import IRawToken from "./iraw-token";

export default class ApplicationTokenManager extends ConnectionManager {
    public _waitForFirstTokenPromise: Promise<undefined>;
    public _tokenHasBeenSet: (() => void) | null;
    public _applicationAccessToken: string | null;
    public _rawOAuthToken: IRawToken | null;
    public _oauthTokenRevocationHeaders: {};
    public _oauthTokenRevocationMethod: string;
    public _oauthTokenRevocationUri: string;
    public _clientId: string;

    constructor(logger: PinoLogger, connection: IConnection, clientId: string, oauthTokenRevocationUri: string) {
        super(logger, connection);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof clientId, "string");
        assert.greater(clientId.length, 0);
        assert.equal(typeof oauthTokenRevocationUri, "string");
        assert.greater(oauthTokenRevocationUri.length, 0);
        assert(oauthTokenRevocationUri.startsWith("https://"));

        this._logger = logger.child("ApplicationTokenManager");
        this._clientId = clientId;
        this._oauthTokenRevocationUri = oauthTokenRevocationUri;

        this._oauthTokenRevocationMethod = "post";
        this._oauthTokenRevocationHeaders = {};

        this._rawOAuthToken = null;
        this._applicationAccessToken = null;

        this._tokenHasBeenSet = null;

        this._waitForFirstTokenPromise = new Promise((resolve, reject) => {
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

    public async start() {
        assert.hasLength(arguments, 0);

        await super.start();
        return this._connection.force(true);
    }

    public async stop() {
        assert.hasLength(arguments, 0);

        await this._revokeTokenIfSet(this._applicationAccessToken);
        return super.stop();
    }

    public async _dataHandler(data: any): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this._logger.trace(data, "_dataHandler");

        await Promise.all([
            this._revokeTokenIfSet(this._applicationAccessToken),
            this._setToken(data),
        ]);
    }

    public async _filter(data: any) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (typeof data !== "object") {
            return false;
        }

        if (typeof data.access_token !== "string") {
            return false;
        }

        return true;
    }

    public async _setToken(data: IRawToken) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this._rawOAuthToken = data;
        this._applicationAccessToken = data.access_token;

        await this._tokenHasBeenSet!();

        return undefined;
    }

    public async _sendRevocation(params: object): Promise<object> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof params, "object");

        // TODO: use TokenHelper.revoke().
        const axiosInstanceConfig = {
            baseURL: this._oauthTokenRevocationUri,
            headers: this._oauthTokenRevocationHeaders,
            // NOTE: per-instance method has no effect due to bug in axios, must use per request.
            // TODO: remove per-call overrides once axios has been fixed.
            // https://github.com/axios/axios/issues/723
            method: this._oauthTokenRevocationMethod,
            params,
        };

        const axiosInstance = axios.create(axiosInstanceConfig);

        const response = await axiosInstance.request({
            // NOTE: per-instance method has no effect due to bug in axios, must use per request.
            // TODO: remove per-call overrides once axios has been fixed.
            // https://github.com/axios/axios/issues/723
            method: this._oauthTokenRevocationMethod,
        });

        // TODO: check if {status:"ok"};
        const data = response.data;

        return data;
    }

    public async _revokeToken(token: string): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof token, "string");
        assert.greater(token.length, 0);

        const data = {
            client_id: this._clientId,
            token,
        };

        this._logger.trace(data, "_revokeToken");

        await this._sendRevocation(data);
    }

    public async _revokeTokenIfSet(token: string | null): Promise<void> {
        assert.hasLength(arguments, 1);

        if (typeof token === "string") {
            return this._revokeToken(token);
        }

        return undefined;
    }

    public async get(): Promise<string | null> {
        assert.hasLength(arguments, 0);

        return this._applicationAccessToken;
    }

    public async getOrWait(): Promise<string> {
        assert.hasLength(arguments, 0);

        await this._waitForFirstTokenPromise;

        const token = await this.get();

        return token!;
    }
}
