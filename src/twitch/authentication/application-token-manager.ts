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

import ConnectionManager from "../../connection/connection-manager";
import PinoLogger from "../../util/pino-logger";
import IPollingConnection from "../polling/ipolling-connection";
import IRawToken from "./iraw-token";

export default class ApplicationTokenManager extends ConnectionManager<IRawToken> {
    private waitForFirstTokenPromise: Promise<undefined>;
    private tokenHasBeenSet: (() => void) | null;
    private applicationAccessToken: string | null;
    private rawOAuthToken: IRawToken | null;
    private oauthTokenRevocationHeaders: {};
    private oauthTokenRevocationMethod: string;
    private oauthTokenRevocationUri: string;
    private clientId: string;

    constructor(
        logger: PinoLogger,
        connection: IPollingConnection<IRawToken>,
        clientId: string,
        oauthTokenRevocationUri: string,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof clientId, "string");
        assert.greater(clientId.length, 0);
        assert.equal(typeof oauthTokenRevocationUri, "string");
        assert.greater(oauthTokenRevocationUri.length, 0);
        assert(oauthTokenRevocationUri.startsWith("https://"));

        this.logger = logger.child("ApplicationTokenManager");
        this.clientId = clientId;
        this.oauthTokenRevocationUri = oauthTokenRevocationUri;

        this.oauthTokenRevocationMethod = "post";
        this.oauthTokenRevocationHeaders = {};

        // TODO: use rawOAuthToken for anything?
        this.rawOAuthToken = null;
        this.applicationAccessToken = null;

        this.tokenHasBeenSet = null;

        this.waitForFirstTokenPromise = new Promise((resolve, reject) => {
            const waitForToken = () => {
                resolve();
            };

            this.tokenHasBeenSet = waitForToken;
        })
            .then(() => {
                this.logger.info("Received first token.", "waitForFirstTokenPromise");

                return undefined;
            });
    }

    public async start() {
        assert.hasLength(arguments, 0);

        await super.start();

        const pollingConnection = this.connection as IPollingConnection<IRawToken>;

        return pollingConnection.send(undefined);
    }

    public async stop() {
        assert.hasLength(arguments, 0);

        await this.revokeTokenIfSet(this.applicationAccessToken);
        return super.stop();
    }

    public async revokeToken(token: string): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof token, "string");
        assert.greater(token.length, 0);

        const data = {
            client_id: this.clientId,
            token,
        };

        this.logger.trace(data, "revokeToken");

        await this.sendRevocation(data);
    }

    public async get(): Promise<string | null> {
        assert.hasLength(arguments, 0);

        return this.applicationAccessToken;
    }

    public async getOrWait(): Promise<string> {
        assert.hasLength(arguments, 0);

        await this.waitForFirstTokenPromise;

        const token = await this.get();

        return token!;
    }

    protected async dataHandler(data: IRawToken): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.logger.trace(data, "dataHandler");

        await Promise.all([
            this.revokeTokenIfSet(this.applicationAccessToken),
            this.setToken(data),
        ]);
    }

    protected async filter(data: IRawToken): Promise<boolean> {
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

    private async setToken(data: IRawToken) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.rawOAuthToken = data;
        this.applicationAccessToken = data.access_token;

        await this.tokenHasBeenSet!();

        return undefined;
    }

    private async sendRevocation(params: object): Promise<object> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof params, "object");

        // TODO: use TokenHelper.revoke().
        const axiosInstanceConfig = {
            baseURL: this.oauthTokenRevocationUri,
            headers: this.oauthTokenRevocationHeaders,
            // NOTE: per-instance method has no effect due to bug in axios, must use per request.
            // TODO: remove per-call overrides once axios has been fixed.
            // https://github.com/axios/axios/issues/723
            method: this.oauthTokenRevocationMethod,
            params,
        };

        const axiosInstance = axios.create(axiosInstanceConfig);

        const response = await axiosInstance.request({
            // NOTE: per-instance method has no effect due to bug in axios, must use per request.
            // TODO: remove per-call overrides once axios has been fixed.
            // https://github.com/axios/axios/issues/723
            method: this.oauthTokenRevocationMethod,
        });

        // TODO: check if {status:"ok"};
        const data = response.data;

        return data;
    }

    private async revokeTokenIfSet(token: string | null): Promise<void> {
        assert.hasLength(arguments, 1);

        if (typeof token === "string") {
            return this.revokeToken(token);
        }

        return undefined;
    }
}
