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
    autoinject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import axios from "axios";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import ConnectionManager from "@botten-nappet/shared/src/connection/connection-manager";

import IRawToken from "@botten-nappet/interface-shared-twitch/src/authentication/iraw-token";

import PollingApplicationTokenConnection from "@botten-nappet/backend-twitch/src/authentication/polling-application-token-connection";
import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";
import IPollingConnection from "@botten-nappet/backend-twitch/src/polling/connection/ipolling-connection";

@asrt(3)
@autoinject
export default class ApplicationTokenManager extends ConnectionManager<IRawToken> {
    private waitForFirstTokenPromise: Promise<undefined>;
    private tokenHasBeenSet: (() => void) | null;
    private applicationAccessToken: string | null;
    private rawOAuthToken: IRawToken | null;
    private oauthTokenRevocationHeaders: {};
    private oauthTokenRevocationMethod: string;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: PollingApplicationTokenConnection,
        @asrt() private readonly applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);

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

    @asrt(0)
    public async start(): Promise<void> {
        await super.start();

        const pollingConnection = this.connection as IPollingConnection<IRawToken>;

        return pollingConnection.send(undefined);
    }

    @asrt(0)
    public async stop(): Promise<void> {
        await this.revokeTokenIfSet(this.applicationAccessToken);
        return super.stop();
    }

    @asrt(1)
    public async revokeToken(
        @asrt() token: string,
    ): Promise<void> {
        assert.nonEmptyString(token);

        const data = {
            client_id: this.applicationTokenManagerConfig.appClientId,
            token,
        };

        this.logger.trace(data, "revokeToken");

        await this.sendRevocation(data);
    }

    @asrt(0)
    public async get(): Promise<string | null> {
        return this.applicationAccessToken;
    }

    @asrt(0)
    public async getOrWait(): Promise<string> {
        await this.waitForFirstTokenPromise;

        const token = await this.get();

        return token!;
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IRawToken,
    ): Promise<void> {
        this.logger.trace(data, "dataHandler");

        await Promise.all([
            this.revokeTokenIfSet(this.applicationAccessToken),
            this.setToken(data),
        ]);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IRawToken,
    ): Promise<boolean> {
        if (typeof data !== "object") {
            return false;
        }

        if (typeof data.access_token !== "string") {
            return false;
        }

        return true;
    }

    @asrt(1)
    private async setToken(
        @asrt() data: IRawToken,
    ) {
        this.rawOAuthToken = data;
        this.applicationAccessToken = data.access_token;

        await this.tokenHasBeenSet!();

        return undefined;
    }

    @asrt(1)
    private async sendRevocation(
        @asrt() params: object,
    ): Promise<object> {
        // TODO: use TokenHelper.revoke().
        const axiosInstanceConfig = {
            baseURL: this.applicationTokenManagerConfig.oauthTokenRevocationUri,
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

    @asrt(1)
    private async revokeTokenIfSet(token: string | null): Promise<void> {
        if (typeof token === "string") {
            return this.revokeToken(token);
        }

        return undefined;
    }
}
