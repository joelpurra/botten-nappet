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

const readline = require("readline");

const axios = require("axios");
const qs = require("qs");

export default class UserHelper {
    constructor(
        logger,
        csrfHelper,
        UserRepository,
        oauthTokenRevocationUri,
        oauthAuthorizationUri,
        appOAuthRedirectUrl,
        oauthTokenUri,
        oauthTokenVerificationUri,
        usersDataUri,
        appClientId,
        appClientSecret,
        applicationAccessTokenProvider
    ) {
        assert.strictEqual(arguments.length, 12);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof csrfHelper, "object");
        assert.strictEqual(typeof UserRepository, "function");
        assert.strictEqual(typeof oauthTokenRevocationUri, "string");
        assert(oauthTokenRevocationUri.length > 0);
        assert(oauthTokenRevocationUri.startsWith("https://"));
        assert.strictEqual(typeof oauthAuthorizationUri, "string");
        assert(oauthAuthorizationUri.length > 0);
        assert(oauthAuthorizationUri.startsWith("https://"));
        assert.strictEqual(typeof appOAuthRedirectUrl, "string");
        assert(appOAuthRedirectUrl.length > 0);
        assert(appOAuthRedirectUrl.startsWith("https://"));
        assert.strictEqual(typeof oauthTokenUri, "string");
        assert(oauthTokenUri.length > 0);
        assert(oauthTokenUri.startsWith("https://"));
        assert.strictEqual(typeof oauthTokenVerificationUri, "string");
        assert(oauthTokenVerificationUri.length > 0);
        assert(oauthTokenVerificationUri.startsWith("https://"));
        assert.strictEqual(typeof usersDataUri, "string");
        assert(usersDataUri.length > 0);
        assert(usersDataUri.startsWith("https://"));
        assert.strictEqual(typeof appClientId, "string");
        assert(appClientId.length > 0);
        assert.strictEqual(typeof appClientSecret, "string");
        assert(appClientSecret.length > 0);
        assert.strictEqual(typeof applicationAccessTokenProvider, "function");

        this._logger = logger.child("UserHelper");
        this._csrfHelper = csrfHelper;
        this._UserRepository = UserRepository;
        this._oauthTokenRevocationUri = oauthTokenRevocationUri;
        this._oauthAuthorizationUri = oauthAuthorizationUri;
        this._appOAuthRedirectUrl = appOAuthRedirectUrl;
        this._oauthTokenUri = oauthTokenUri;
        this._oauthTokenVerificationUri = oauthTokenVerificationUri;
        this._usersDataUri = usersDataUri;
        this._appClientId = appClientId;
        this._appClientSecret = appClientSecret;
        this._applicationAccessTokenProvider = applicationAccessTokenProvider;
    }

    _twitchQuerystringSerializer(params) {
        // TODO: move to utility class.
        const qsConfig = {
            // NOTE: "repeat" for the "new" Twitch api (v6?).
            arrayFormat: "repeat",
        };

        return qs.stringify(params, qsConfig);
    };

    _getUsersData(...usernamesAndIds) {
        assert(Array.isArray(usernamesAndIds));
        assert(usernamesAndIds.length > 0);
        assert(usernamesAndIds.every((usernameOrId) => typeof usernameOrId === "string" || typeof usernameOrId === "number"));

        // https://dev.twitch.tv/docs/api/reference#get-users
        // const sampleResponse = {
        //     "data": [
        //         {
        //             "id": "44322889",
        //             "login": "dallas",
        //             "display_name": "dallas",
        //             "type": "staff",
        //             "broadcaster_type": "",
        //             "description": "Just a gamer playing games and chatting. :)",
        //             "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
        //             "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
        //             "view_count": 191836881,
        //             "email": "login@provider.com",
        //         },
        //     ],
        // };

        return Promise.try(() => {
            return this._applicationAccessTokenProvider()
                .then((applicationAccessToken) => {
                    const usernames = usernamesAndIds.filter((usernameOrId) => typeof usernameOrId === "string");
                    const ids = usernamesAndIds.filter((usernameOrId) => typeof usernameOrId === "number");

                    const params = {
                        login: usernames,
                        id: ids,
                    };

                    // TODO: use an https class.
                    return Promise.resolve(axios.get(
                        this._usersDataUri,
                        {
                            paramsSerializer: this._twitchQuerystringSerializer,
                            params: params,
                            headers: {
                                Authorization: `Bearer ${applicationAccessToken}`,
                            },
                        }
                    ))
                    // NOTE: axios response data.
                        .get("data")
                        // NOTE: twitch response data.
                        .get("data")
                        .tap((users) => {
                            this._logger.trace(users, usernamesAndIds, "_getUsersData");
                        });
                });
        });
    }

    getUserIdByUserName(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        return this._getUsersData(username)
            .get(0)
            .get("id");
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

            const serializedParams = this._twitchQuerystringSerializer(params);

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

    _getUserTokenFromUser() {
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

                const serializedData = this._twitchQuerystringSerializer(data);

                // TODO: use an https class.
                return Promise.resolve(axios.post(this._oauthTokenUri, serializedData))
                // NOTE: axios response data.
                    .get("data");
            })
            .tap((token) => {
                this._logger.trace(token, "_getUserTokenFromUser");
            });
    }

    _getUserTokenFromDatabase(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        return Promise.resolve()
            .then(() => {
                const findUser = {
                    username: username,
                };

                return Promise.resolve(this._UserRepository.findOne(findUser))
                    .then((userWithToken) => {
                        const isValidUserToken = (
                            userWithToken
                              && typeof userWithToken.twitchToken === "object"
                              && typeof userWithToken.twitchToken.access_token === "string"
                        );

                        if (isValidUserToken) {
                            return userWithToken.twitchToken;
                        }

                        return null;
                    });
            })
            .tap((token) => {
                this._logger.trace(token, "_getUserTokenFromDatabase");
            });
    }

    _writeUserToken(username, token) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);
        // NOTE: token can be null, to "forget" it.
        assert.strictEqual(typeof token, "object");

        return Promise.resolve()
            .then(() => {
                const findUser = {
                    username: username,
                };
                const upsertUser = {
                    username: username,
                    twitchToken: token,
                };

                return Promise.resolve(this._UserRepository.findOneAndUpdate(
                    findUser,
                    upsertUser,
                    {
                        upsert: true,
                    }
                ));
            })
            .tap((userAfterStoring) => {
                this._logger.trace(userAfterStoring, "_writeUserToken");
            });
    }

    storeUserToken(username, token) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);
        assert(token !== null);
        assert.strictEqual(typeof token, "object");

        return Promise.resolve()
            .then(() => this._writeUserToken(username, token))
            .tap((userAfterStoring) => {
                this._logger.trace(userAfterStoring, "storeUserToken");
            });
    }

    forgetUserToken(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        return Promise.resolve()
            .then(() => this._writeUserToken(username, null))
            .tap((userAfterStoring) => {
                this._logger.trace(userAfterStoring, "forgetUserToken");
            });
    }

    getUserToken(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        return Promise.resolve()
            .then(() => this._getUserTokenFromDatabase(username))
            .then((tokenFromDatabase) => {
                if (tokenFromDatabase) {
                    return tokenFromDatabase;
                }

                return this._getUserTokenFromUser()
                    .tap((tokenFromUser) => this.storeUserToken(username, tokenFromUser));
            })
            .tap((token) => {
                this._logger.trace(token, "getUserToken");
            });
    }

    _getTokenValidation(token) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof token, "object");
        assert.strictEqual(typeof token.access_token, "string");
        assert(token.access_token.length > 0);

        // TODO: move/refactor/reuse function for application access tokens?
        // TODO: use as a way to get username/userid/scopes from a user access token.
        // https://dev.twitch.tv/docs/v5#root-url
        // const sampleResponse = {
        //     "token": {
        //         "authorization": {
        //             "created_at": "2016-12-14T15:51:16Z",
        //             "scopes": [
        //                 "user_read",
        //             ],
        //             "updated_at": "2016-12-14T15:51:16Z",
        //         },
        //         "client_id": "uo6dggojyb8d6soh92zknwmi5ej1q2",
        //         "user_id": "44322889",
        //         "user_name": "dallas",
        //         "valid": true,
        //     },
        // };

        return Promise.try(() => {
            const userAccessToken = token.access_token;

            // TODO: use an https class.
            return Promise.resolve(axios.get(
                this._oauthTokenVerificationUri,
                {
                    headers: {
                        Accept: "application/vnd.twitchtv.v5+json",
                        "Client-ID": this._appClientId,
                        Authorization: `OAuth ${userAccessToken}`,
                    },
                }
            ))
            // NOTE: axios response data.
                .get("data")
            // NOTE: twitch response data.
                .get("token")
                .tap((validatedToken) => {
                    this._logger.trace(token, validatedToken, "_getTokenValidation");
                });
        });
    }

    revokeToken(token) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof token, "object");

        // TODO: move/refactor/reuse function for application access tokens?
        // TODO: use as a way to get username/userid/scopes from a user access token.
        // https://dev.twitch.tv/docs/authentication#revoking-access-tokens

        return Promise.try(() => {
            const userAccessToken = token.access_token;

            const params = {
                client_id: this._appClientId,
                token: userAccessToken,
            };

            // TODO: use an https class.
            return Promise.resolve(axios.post(
                this._oauthTokenRevocationUri,
                {
                    paramsSerializer: this._twitchQuerystringSerializer,
                    params: params,
                }
            ))
            // NOTE: axios response data.
                .get("data")
            // NOTE: twitch response data.
                .get("token")
                .tap((validatedToken) => {
                    this._logger.trace(token, validatedToken, "revokeToken");
                });
        });
    }

    isTokenValid(token) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof token, "object");

        return Promise.try(() => {
            return this._getTokenValidation(token)
            // NOTE: twitch response data.
                .get("valid")
                .tap((valid) => {
                    this._logger.trace(token, valid, "isTokenValid");
                });
        });
    }
}
