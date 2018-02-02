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

const deepStrictEqual = require("deep-strict-equal");

const readline = require("readline");

const axios = require("axios");
const qs = require("qs");

export default class UserTokenHelper {
    constructor(
        logger,
        csrfHelper,
        userStorageHelper,
        requestHelper,
        oauthAuthorizationUri,
        appOAuthRedirectUrl,
        oauthTokenUri,
        appClientId,
        appClientSecret
    ) {
        assert.strictEqual(arguments.length, 9);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof csrfHelper, "object");
        assert.strictEqual(typeof userStorageHelper, "object");
        assert.strictEqual(typeof requestHelper, "object");
        assert.strictEqual(typeof oauthAuthorizationUri, "string");
        assert(oauthAuthorizationUri.length > 0);
        assert(oauthAuthorizationUri.startsWith("https://"));
        assert.strictEqual(typeof appOAuthRedirectUrl, "string");
        assert(appOAuthRedirectUrl.length > 0);
        assert(appOAuthRedirectUrl.startsWith("https://"));
        assert.strictEqual(typeof oauthTokenUri, "string");
        assert(oauthTokenUri.length > 0);
        assert(oauthTokenUri.startsWith("https://"));
        assert.strictEqual(typeof appClientId, "string");
        assert(appClientId.length > 0);
        assert.strictEqual(typeof appClientSecret, "string");
        assert(appClientSecret.length > 0);

        this._logger = logger.child("UserTokenHelper");
        this._csrfHelper = csrfHelper;
        this._userStorageHelper = userStorageHelper;
        this._requestHelper = requestHelper;
        this._oauthAuthorizationUri = oauthAuthorizationUri;
        this._appOAuthRedirectUrl = appOAuthRedirectUrl;
        this._oauthTokenUri = oauthTokenUri;
        this._appClientId = appClientId;
        this._appClientSecret = appClientSecret;
    }

    async _getUserAuthorizationUrl(randomCSRF) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof randomCSRF, "string");
        assert(randomCSRF.length > 0);

        // TODO: configure scopes per request or per activity/subclass.
        // https://dev.twitch.tv/docs/authentication#scopes
        const scopes = [
            "channel_feed_read",
            "channel_subscriptions",
            "chat_login",
        ];
        const serializedScopes = scopes.join(" ");

        const params = {
            client_id: this._appClientId,
            redirect_uri: this._appOAuthRedirectUrl,
            response_type: "code",
            scope: serializedScopes,
            force_verify: "true",
            state: randomCSRF,
        };

        const serializedParams = this._requestHelper.twitchQuerystringSerializer(params);

        const url = `${this._oauthAuthorizationUri}?${serializedParams}`;

        return url;
    }

    async _parseCodeFromAnswer(answer, randomCSRF) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof answer, "string");
        assert(answer.length > 0);
        assert.strictEqual(typeof randomCSRF, "string");
        assert(randomCSRF.length > 0);

        const paramsRx = /\?(.+)$/i;

        let code = null;

        if (paramsRx.test(answer)) {
            const matches = paramsRx.exec(answer);

            const querystring = matches[1];

            const params = qs.parse(querystring);

            // NOTE: security check.
            if (params.state !== randomCSRF) {
                throw new Error("Random CSRF mismatch.");
            }

            code = params.code;
        } else {
            code = answer;
        }

        assert.strictEqual(typeof code, "string");
        assert(code.length > 0);

        return code;
    }

    async _promptForCodeOrUrl() {
        assert.strictEqual(arguments.length, 0);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        return new Promise((resolve, reject) => {
            try {
                rl.question("Paste the code or full url: ", (answer) => resolve(answer));
            } catch (error) {
                reject(error);
            }
        })
            .tap(() => {
                rl.close();
            })
            .tap((answer) => {
                assert.strictEqual(typeof answer, "string");
                assert(answer.length > 0);
            });
    }

    async _promptToOpenAuthorizationUrl(userAuthorizationUrl) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof userAuthorizationUrl, "string");
        assert(userAuthorizationUrl.length > 0);
        assert(userAuthorizationUrl.startsWith("https://"));

        console.info("Open this url and authorize the application:", userAuthorizationUrl);

        return undefined;
    }

    async _getUserAuthorizationCode() {
        assert.strictEqual(arguments.length, 0);

        // TODO: replace with an https server.
        const randomCSRF = await this._csrfHelper.getRandomCSRF();

        const userAuthorizationUrl = await this._getUserAuthorizationUrl(randomCSRF);

        await this._promptToOpenAuthorizationUrl(userAuthorizationUrl);

        const answer = await this._promptForCodeOrUrl();
        const code = await this._parseCodeFromAnswer(answer, randomCSRF);

        assert.strictEqual(typeof code, "string");
        assert(code.length > 0);

        return code;
    }

    async _getUserTokenFromUserTerminalPrompt() {
        assert.strictEqual(arguments.length, 0);

        // https://dev.twitch.tv/docs/authentication#oauth-authorization-code-flow-user-access-tokens
        // const sampleResponse = {
        //     "access_token": "0123456789abcdefghijABCDEFGHIJ",
        //     "refresh_token": "eyJfaWQmNzMtNGCJ9%6VFV5LNrZFUj8oU231/3Aj",
        //     "expires_in": 3600,
        //     "scope": "viewing_activity_read",
        // };

        // TODO: replace with an https server.
        const code = await this._getUserAuthorizationCode();

        assert.strictEqual(typeof code, "string");
        assert(code.length > 0);

        const data = {
            client_id: this._appClientId,
            client_secret: this._appClientSecret,
            code: code,
            grant_type: "authorization_code",
            redirect_uri: this._appOAuthRedirectUrl,
        };

        const serializedData = this._requestHelper.twitchQuerystringSerializer(data);

        // TODO: use an https class.
        const response = await axios.post(this._oauthTokenUri, serializedData);

        // NOTE: axios response data.
        const rawToken = response.data;

        this._logger.trace(rawToken, "_getUserTokenFromUserTerminalPrompt");

        return rawToken;
    }

    async _getUserTokenFromDatabase(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        const user = await this._userStorageHelper.getByUsername(username);

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

        this._logger.trace(token, "_getUserTokenFromDatabase");

        return token;
    }

    async store(username, rawToken) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);
        assert(rawToken !== null);
        assert.strictEqual(typeof rawToken, "object");
        assert.strictEqual(typeof rawToken.access_token, "string");

        const userAfterStoring = await this._userStorageHelper.storeToken(username, rawToken);

        const augmentedToken = userAfterStoring.twitchToken;

        this._logger.trace(augmentedToken, "store");

        return augmentedToken;
    }

    async forget(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        const userAfterStoring = await this._userStorageHelper.storeToken(username, null);

        this._logger.trace(userAfterStoring, "forgetUserToken");

        return userAfterStoring;
    }

    async get(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        let result = null;

        const tokenFromDatabase = await this._getUserTokenFromDatabase(username);

        if (tokenFromDatabase) {
            result = tokenFromDatabase;
        } else {
            const rawToken = await this._getUserTokenFromUserTerminalPrompt();
            const tokenFromUserTerminalPrompt = await this.store(username, rawToken);

            result = tokenFromUserTerminalPrompt;
        }

        this._logger.trace(result, "getUserToken");

        return result;
    }

    async refresh(tokenToRefresh) {
        assert.strictEqual(arguments.length, 1);
        assert.notStrictEqual(tokenToRefresh, null);
        assert.strictEqual(typeof tokenToRefresh, "object");
        assert.strictEqual(typeof tokenToRefresh.token, "object");

        const data = {
            grant_type: "refresh_token",
            refresh_token: tokenToRefresh.token.refresh_token,
            client_id: this._appClientId,
            client_secret: this._appClientSecret,
        };

        const serializedData = this._requestHelper.twitchQuerystringSerializer(data);

        // TODO: use an https class.
        const response = await axios.post(this._oauthTokenUri, serializedData);

        // NOTE: axios response data.
        const rawRefreshedToken = response.data;

        const wasUpdated = deepStrictEqual(rawRefreshedToken, tokenToRefresh);

        this._logger.trace(rawRefreshedToken, tokenToRefresh, wasUpdated, "get");

        return rawRefreshedToken;
    }
}
