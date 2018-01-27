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

export default class TokenHelper {
    constructor(
        logger,
        requestHelper,
        oauthTokenRevocationUri,
        oauthTokenVerificationUri,
        appClientId
    ) {
        assert.strictEqual(arguments.length, 5);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof requestHelper, "object");
        assert.strictEqual(typeof oauthTokenRevocationUri, "string");
        assert(oauthTokenRevocationUri.length > 0);
        assert(oauthTokenRevocationUri.startsWith("https://"));
        assert.strictEqual(typeof oauthTokenVerificationUri, "string");
        assert(oauthTokenVerificationUri.length > 0);
        assert(oauthTokenVerificationUri.startsWith("https://"));
        assert.strictEqual(typeof appClientId, "string");
        assert(appClientId.length > 0);

        this._logger = logger.child("TokenHelper");
        this._requestHelper = requestHelper;
        this._oauthTokenRevocationUri = oauthTokenRevocationUri;
        this._oauthTokenVerificationUri = oauthTokenVerificationUri;
        this._appClientId = appClientId;
    }

    _getTokenValidation(token) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof token, "object");
        assert.strictEqual(typeof token.access_token, "string");
        assert(token.access_token.length > 0);

        // https://dev.twitch.tv/docs/v5#root-url
        //
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
            const accessToken = token.access_token;

            // TODO: use an https class.
            return Promise.resolve(axios.get(
                this._oauthTokenVerificationUri,
                {
                    headers: {
                        Accept: "application/vnd.twitchtv.v5+json",
                        "Client-ID": this._appClientId,
                        Authorization: `OAuth ${accessToken}`,
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

        // https://dev.twitch.tv/docs/authentication#revoking-access-tokens

        return Promise.try(() => {
            const accessToken = token.access_token;

            const params = {
                client_id: this._appClientId,
                token: accessToken,
            };

            // TODO: use an https class.
            return Promise.resolve(axios.post(
                this._oauthTokenRevocationUri,
                {
                    paramsSerializer: this._requestHelper.twitchQuerystringSerializer,
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

    getUserIdByAccessToken(token) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof token, "object");

        return Promise.try(() => {
            return this._getTokenValidation(token)
            // NOTE: twitch response data.
                .get("user_id")
                .tap((userId) => {
                    this._logger.trace(token, userId, "getUserIdByAccessToken");
                });
        });
    }

    getUserNameByAccessToken(token) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof token, "object");

        return Promise.try(() => {
            return this._getTokenValidation(token)
            // NOTE: twitch response data.
                .get("user_name")
                .tap((userName) => {
                    this._logger.trace(token, userName, "getUserNameByAccessToken");
                });
        });
    }
}
