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

export default class UserTokenManager {
    constructor(logger, tokenHelper, userHelper) {
        assert.strictEqual(arguments.length, 3);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof tokenHelper, "object");
        assert.strictEqual(typeof userHelper, "object");

        this._logger = logger.child("UserTokenManager");
        this._tokenHelper = tokenHelper;
        this._userHelper = userHelper;
    }

    get(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        return Promise.try(() => {
            // TODO: replace with an https server.
            return this._userHelper.getUserToken(username)
                .then((userToken) => {
                    return this._tokenHelper.isTokenValid(userToken)
                        .then((isValid) => {
                            if (isValid) {
                                return userToken;
                            }

                            return this._userHelper.forgetUserToken(username)
                                // TODO: user-wrappers with username for the generic token functions?
                                .then(() => this._tokenHelper.revokeToken(userToken))
                                .then(() => this._userHelper.getUserToken(username));
                        });
                })
                // TODO: improve getting/refreshing the token to have a creation time, not just expiry time.
                .then((userToken) => this._userHelper.ensureRefreshed(userToken))
                .tap((refreshedToken) => this._userHelper.storeUserToken(username, refreshedToken));
        });
    }
}
