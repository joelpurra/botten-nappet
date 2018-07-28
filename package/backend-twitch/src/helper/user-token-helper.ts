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
import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import readline from "readline";

import axios from "axios";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IAugmentedToken from "@botten-nappet/interface-shared-twitch/src/authentication/iaugmented-token";
import IRawToken from "@botten-nappet/interface-shared-twitch/src/authentication/iraw-token";

import IUser from "@botten-nappet/server-twitch/src/storage/interface/iuser";
import UserStorageManager from "@botten-nappet/server-twitch/src/storage/manager/user-storage-manager";

import UserAuthenticationConfig from "@botten-nappet/backend-twitch/src/config/user-authentication-config";

import CSRFHelper from "@botten-nappet/backend-twitch/src/helper/csrf-helper";
import RequestHelper from "@botten-nappet/backend-twitch/src/helper/request-helper";

@asrt(5)
@autoinject
export default class UserTokenHelper {
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly csrfHelper: CSRFHelper,
        @asrt() private readonly userStorageManager: UserStorageManager,
        @asrt() private readonly requestHelper: RequestHelper,
        @asrt() private readonly userAuthenticationConfig: UserAuthenticationConfig,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async getUserTokenFromUserTerminalPrompt(): Promise<IRawToken> {
        // https://dev.twitch.tv/docs/authentication#oauth-authorization-code-flow-user-access-tokens
        // const sampleResponse = {
        //     "access_token": "0123456789abcdefghijABCDEFGHIJ",
        //     "refresh_token": "eyJfaWQmNzMtNGCJ9%6VFV5LNrZFUj8oU231/3Aj",
        //     "expires_in": 3600,
        //     "scope": "viewing_activity_read",
        // };

        // TODO: replace with an https server.
        const code = await this.getUserAuthorizationCode();

        assert.nonEmptyString(code);

        const data = {
            client_id: this.userAuthenticationConfig.twitchAppClientId,
            client_secret: this.userAuthenticationConfig.twitchAppClientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: this.userAuthenticationConfig.twitchAppOAuthRedirectUrl,
        };

        const serializedData = this.requestHelper.twitchQuerystringSerializer(data);

        // TODO: use an https class.
        const response = await axios.post(this.userAuthenticationConfig.twitchOAuthTokenUri, serializedData);

        // NOTE: axios response data.
        // TODO: verify token format.
        const rawToken: IRawToken = response.data;

        this.logger.trace(rawToken, "getUserTokenFromUserTerminalPrompt");

        return rawToken;
    }

    @asrt(1)
    public async getUserTokenFromDatabase(
        @asrt() username: string,
    ): Promise<IAugmentedToken | null> {
        assert.nonEmptyString(username);

        const user = await this.userStorageManager.getByUsername(username);

        const isValidUserToken = (
            user
            && user.twitchToken !== null
            && typeof user.twitchToken === "object"
            && user.twitchToken.token !== null
            && typeof user.twitchToken.token === "object"
            && typeof user.twitchToken.token.access_token === "string"
        );

        let token = null;

        if (isValidUserToken) {
            token = user.twitchToken;
        }

        this.logger.trace(token, "getUserTokenFromDatabase");

        return token;
    }

    @asrt(2)
    public async store(
        @asrt() username: string, rawToken: IRawToken,
    ): Promise<IAugmentedToken> {
        assert.nonEmptyString(username);

        const userAfterStoring = await this.userStorageManager.storeToken(username, rawToken);

        const augmentedToken: IAugmentedToken = userAfterStoring.twitchToken;

        this.logger.trace(augmentedToken, "store");

        return augmentedToken;
    }

    @asrt(1)
    public async forget(
        @asrt() username: string,
    ): Promise<IUser> {
        assert.nonEmptyString(username);

        const userAfterStoring = await this.userStorageManager.storeToken(username, null);

        this.logger.trace(userAfterStoring, "forgetUserToken");

        return userAfterStoring;
    }

    @asrt(1)
    public async get(
        @asrt() username: string,
    ): Promise<IAugmentedToken> {
        assert.nonEmptyString(username);

        let result = null;

        const tokenFromDatabase = await this.getUserTokenFromDatabase(username);

        if (tokenFromDatabase) {
            result = tokenFromDatabase;
        } else {
            const rawToken = await this.getUserTokenFromUserTerminalPrompt();
            const tokenFromUserTerminalPrompt = await this.store(username, rawToken);

            result = tokenFromUserTerminalPrompt;
        }

        this.logger.trace(result, "getUserToken");

        return result;
    }

    @asrt(1)
    public async refresh(
        @asrt() tokenToRefresh: IAugmentedToken,
    ): Promise<IRawToken> {
        const data = {
            client_id: this.userAuthenticationConfig.twitchAppClientId,
            client_secret: this.userAuthenticationConfig.twitchAppClientSecret,
            grant_type: "refresh_token",
            // TODO: better null handling.
            refresh_token: tokenToRefresh.token!.refresh_token,
        };

        const serializedData = this.requestHelper.twitchQuerystringSerializer(data);

        // TODO: use an https class.
        const response = await axios.post(this.userAuthenticationConfig.twitchOAuthTokenUri, serializedData);

        // NOTE: axios response data.
        // TODO: verify reponse data.
        const rawRefreshedToken: IRawToken = response.data;

        this.logger.trace(rawRefreshedToken, tokenToRefresh, "get");

        return rawRefreshedToken;
    }

    @asrt(1)
    private async getUserAuthorizationUrl(
        @asrt() randomCSRF: string,
    ): Promise<string> {
        assert.nonEmptyString(randomCSRF);

        // TODO: configure scopes per request or per activity/subclass.
        // https://dev.twitch.tv/docs/authentication#scopes
        const scopes = [
            "channel_feed_read",
            "channel_subscriptions",
            "chat_login",
        ];
        const serializedScopes = scopes.join(" ");

        const params = {
            client_id: this.userAuthenticationConfig.twitchAppClientId,
            force_verify: "true",
            redirect_uri: this.userAuthenticationConfig.twitchAppOAuthRedirectUrl,
            response_type: "code",
            scope: serializedScopes,
            state: randomCSRF,
        };

        const serializedParams = this.requestHelper.twitchQuerystringSerializer(params);

        const url = `${this.userAuthenticationConfig.twitchOAuthAuthorizationUri}?${serializedParams}`;

        return url;
    }

    @asrt(2)
    private async parseCodeFromAnswer(
        @asrt() answer: string,
        @asrt() randomCSRF: string,
    ): Promise<string> {
        assert.nonEmptyString(answer);
        assert.nonEmptyString(randomCSRF);

        const paramsRx = /\?(.+)$/i;

        let code = null;

        if (paramsRx.test(answer)) {
            const matches = paramsRx.exec(answer);

            // TODO: better null handling.
            assert.not.null(matches);

            const querystring = matches![1];

            const params = this.requestHelper.parseQuerystring(querystring);

            // NOTE: security check.
            if (params.state !== randomCSRF) {
                throw new Error("Random CSRF mismatch.");
            }

            code = params.code;
        } else {
            code = answer;
        }

        assert.nonEmptyString(code);

        return code;
    }

    @asrt(0)
    private async promptForCodeOrUrl(): Promise<string> {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const answer = await new Bluebird<string>((resolve, reject) => {
            try {
                rl.question("Paste the code or full url: ", (readlineAnswer) => resolve(readlineAnswer));
            } catch (error) {
                reject(error);
            }
        });

        await rl.close();

        assert.nonEmptyString(answer);

        return answer;
    }

    @asrt(1)
    private async promptToOpenAuthorizationUrl(
        @asrt() userAuthorizationUrl: string,
    ): Promise<void> {
        assert.nonEmptyString(userAuthorizationUrl);
        assert(userAuthorizationUrl.startsWith("https://"));

        /* tslint:disable:no-console */
        console.info("Open this url and authorize the application:", userAuthorizationUrl);
        /* tslint:enable:no-console */
    }

    @asrt(0)
    private async getUserAuthorizationCode(): Promise<string> {
        // TODO: replace with an https server.
        const randomCSRF = await this.csrfHelper.getRandomCSRF();

        const userAuthorizationUrl = await this.getUserAuthorizationUrl(randomCSRF);

        await this.promptToOpenAuthorizationUrl(userAuthorizationUrl);

        const answer = await this.promptForCodeOrUrl();
        const code = await this.parseCodeFromAnswer(answer, randomCSRF);

        assert.nonEmptyString(code);

        return code;
    }
}
