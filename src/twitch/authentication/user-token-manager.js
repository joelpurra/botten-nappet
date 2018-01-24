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

const RefreshToken = require("refresh-token");
const deepStrictEqual = require("deep-strict-equal");

export default class UserTokenManager {
    constructor(logger, userOAuthTokenUri, revocationUri, clientId, clientSecret) {
        assert.strictEqual(arguments.length, 5);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof userOAuthTokenUri, "string");
        assert(userOAuthTokenUri.length > 0);
        assert(userOAuthTokenUri.startsWith("https://"));
        assert.strictEqual(typeof revocationUri, "string");
        assert(revocationUri.length > 0);
        assert(revocationUri.startsWith("https://"));
        assert.strictEqual(typeof clientId, "string");
        assert(clientId.length > 0);
        assert.strictEqual(typeof clientSecret, "string");
        assert(clientSecret.length > 0);

        this._logger = logger.child("UserTokenManager");
        this._userOAuthTokenUri = userOAuthTokenUri;
        this._revocationUri = revocationUri;
        this._clientId = clientId;
        this._clientSecret = clientSecret;
    }

    get(tokenToRefresh) {
        assert.strictEqual(arguments.length, 1);
        assert.notStrictEqual(tokenToRefresh, null);
        assert.strictEqual(typeof tokenToRefresh, "object");

        return Promise.try(() => {
            const refreshTokenWithClientIdAndSecret = {
                access_token: tokenToRefresh.access_token,
                refresh_token: tokenToRefresh.refresh_token,
                expires_in: tokenToRefresh.expires_in,
                client_id: this._clientId,
                client_secret: this._clientSecret,
            };

            const refreshToken = new RefreshToken(
                this._userOAuthTokenUri,
                refreshTokenWithClientIdAndSecret
            );

            const getToken = Promise.promisify(refreshToken.getToken, {
                context: refreshToken,
            });

            return getToken();
        })
            .then((refreshedAccessToken) => {
                const refreshedToken = {
                    access_token: refreshedAccessToken,
                    refresh_token: tokenToRefresh.refresh_token,
                    expires_in: tokenToRefresh.expires_in,
                    scope: tokenToRefresh.scope,
                };

                return refreshedToken;
            })
            .tap((refreshedToken) => {
                const wasUpdated = deepStrictEqual(refreshedToken, tokenToRefresh);

                this._logger.trace(refreshedToken, tokenToRefresh, wasUpdated, "get");
            });
    }
}
