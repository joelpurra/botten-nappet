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

    _getUserAuthorizationUrl(randomCSRF) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof randomCSRF, "string");
        assert(randomCSRF.length > 0);

        return Promise.try(() => {
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
        });
    }

    _parseCodeFromAnswer(answer, randomCSRF) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof answer, "string");
        assert(answer.length > 0);
        assert.strictEqual(typeof randomCSRF, "string");
        assert(randomCSRF.length > 0);

        return Promise.try(() => {
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

            return code;
        })
            .tap((code) => {
                assert.strictEqual(typeof code, "string");
                assert(code.length > 0);
            });
    }

    _promptForCodeOrUrl() {
        assert.strictEqual(arguments.length, 0);

        return Promise.try(() => {
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
        });
    }

    _promptToOpenAuthorizationUrl(userAuthorizationUrl) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof userAuthorizationUrl, "string");
        assert(userAuthorizationUrl.length > 0);
        assert(userAuthorizationUrl.startsWith("https://"));

        return Promise.try(() => {
            /* eslint-disable no-console */
            console.info("Open this url and authorize the application:", userAuthorizationUrl);
            /* eslint-enable no-console */

            return undefined;
        });
    }

    _getUserAuthorizationCode() {
        assert.strictEqual(arguments.length, 0);

        // TODO: replace with an https server.
        return Promise.resolve()
            .then(() => this._csrfHelper.getRandomCSRF())
            .then((randomCSRF) => {
                return this._getUserAuthorizationUrl(randomCSRF)
                    .then((userAuthorizationUrl) => this._promptToOpenAuthorizationUrl(userAuthorizationUrl))
                    .then(() => this._promptForCodeOrUrl())
                    .then((answer) => this._parseCodeFromAnswer(answer, randomCSRF))
                    .tap((code) => {
                        assert.strictEqual(typeof code, "string");
                        assert(code.length > 0);
                    });
            });
    }

    _getUserTokenFromUserTerminalPrompt() {
        assert.strictEqual(arguments.length, 0);

        // https://dev.twitch.tv/docs/authentication#oauth-authorization-code-flow-user-access-tokens
        // const sampleResponse = {
        //     "access_token": "0123456789abcdefghijABCDEFGHIJ",
        //     "refresh_token": "eyJfaWQmNzMtNGCJ9%6VFV5LNrZFUj8oU231/3Aj",
        //     "expires_in": 3600,
        //     "scope": "viewing_activity_read",
        // };

        // TODO: replace with an https server.
        return Promise.resolve()
            .then(() => this._getUserAuthorizationCode())
            .tap((code) => {
                assert.strictEqual(typeof code, "string");
                assert(code.length > 0);
            })
            .then((code) => {
                const data = {
                    client_id: this._appClientId,
                    client_secret: this._appClientSecret,
                    code: code,
                    grant_type: "authorization_code",
                    redirect_uri: this._appOAuthRedirectUrl,
                };

                const serializedData = this._requestHelper.twitchQuerystringSerializer(data);

                // TODO: use an https class.
                return Promise.resolve(axios.post(this._oauthTokenUri, serializedData))
                // NOTE: axios response data.
                    .get("data");
            })
            .tap((rawToken) => {
                this._logger.trace(rawToken, "_getUserTokenFromUserTerminalPrompt");
            });
    }

    _getUserTokenFromDatabase(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        return Promise.resolve(this._userStorageHelper.getByUsername(username))
            .then((user) => {
                const isValidUserToken = (
                    user
                      && user.twitchToken !== null
                      && typeof user.twitchToken === "object"
                      && user.twitchToken.token !== null
                      && typeof user.twitchToken.token === "object"
                      && typeof user.twitchToken.token.access_token === "string"
                );

                if (isValidUserToken) {
                    return user.twitchToken;
                }

                return null;
            })
            .tap((token) => {
                this._logger.trace(token, "_getUserTokenFromDatabase");
            });
    }

    store(username, rawToken) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);
        assert(rawToken !== null);
        assert.strictEqual(typeof rawToken, "object");
        assert.strictEqual(typeof rawToken.access_token, "string");

        return Promise.resolve()
            .then(() => this._userStorageHelper.storeToken(username, rawToken))
            .get("twitchToken")
            .tap((tokenAfterStoring) => {
                this._logger.trace(tokenAfterStoring, "store");
            });
    }

    forget(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        return Promise.resolve()
            .then(() => this._userStorageHelper.storeToken(username, null))
            .tap((userAfterStoring) => {
                this._logger.trace(userAfterStoring, "forgetUserToken");
            });
    }

    get(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        return Promise.resolve()
            .then(() => this._getUserTokenFromDatabase(username))
            .then((tokenFromDatabase) => {
                if (tokenFromDatabase) {
                    return tokenFromDatabase;
                }

                return this._getUserTokenFromUserTerminalPrompt()
                    .then((rawToken) => this.store(username, rawToken));
            })
            .tap((token) => {
                this._logger.trace(token, "getUserToken");
            });
    }

    refresh(tokenToRefresh) {
        assert.strictEqual(arguments.length, 1);
        assert.notStrictEqual(tokenToRefresh, null);
        assert.strictEqual(typeof tokenToRefresh, "object");
        assert.strictEqual(typeof tokenToRefresh.token, "object");

        return Promise.try(() => {
            const data = {
                grant_type: "refresh_token",
                refresh_token: tokenToRefresh.token.refresh_token,
                client_id: this._appClientId,
                client_secret: this._appClientSecret,
            };

            const serializedData = this._requestHelper.twitchQuerystringSerializer(data);

            // TODO: use an https class.
            return Promise.resolve(axios.post(this._oauthTokenUri, serializedData))
            // NOTE: axios response data.
                .get("data");
        })
            .tap((rawRefreshedToken) => {
                const wasUpdated = deepStrictEqual(rawRefreshedToken, tokenToRefresh);

                this._logger.trace(rawRefreshedToken, tokenToRefresh, wasUpdated, "get");
            });
    }
}
