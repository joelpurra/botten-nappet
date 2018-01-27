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

export default class UserStorageHelper {
    constructor(
        logger,
        UserRepository
    ) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof UserRepository, "function");

        this._logger = logger.child("UserStorageHelper");
        this._UserRepository = UserRepository;
    }

    getByUsername(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        return Promise.resolve()
            .then(() => {
                const findUser = {
                    username: username,
                };

                return Promise.resolve(this._UserRepository.findOne(findUser));
            })
            .tap((user) => {
                this._logger.trace(user, "getByUsername");
            });
    }

    store(user) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof user, "object");
        assert.strictEqual(typeof user.username, "string");
        assert(user.username.length > 0);

        return Promise.resolve()
            .then(() => {
                const findUser = {
                    username: user.username,
                };

                return Promise.resolve(this._UserRepository.findOne(findUser))
                    .then((userFromDatabase) => {
                        const userFromDatabaseWithoutId = {
                            ...userFromDatabase,
                        };
                        delete userFromDatabaseWithoutId._id;
                        delete userFromDatabaseWithoutId._schema;

                        // TODO: deep merge.
                        const upsertUser = {
                            ...userFromDatabaseWithoutId,
                            ...user,
                        };
                        delete upsertUser._id;
                        delete upsertUser._schema;

                        return Promise.resolve(this._UserRepository.findOneAndUpdate(
                            userFromDatabaseWithoutId,
                            upsertUser,
                            {
                                upsert: true,
                            }
                        ));
                    });
            })
            .tap((userAfterStoring) => {
                this._logger.trace(userAfterStoring, "store");
            });
    }

    storeToken(username, rawToken) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);
        // NOTE: rawToken can be null, to "forget" it.
        assert.strictEqual(typeof rawToken, "object");
        // TODO: type system.
        assert(rawToken === null || typeof rawToken.access_token === "string");
        assert(rawToken === null || rawToken.access_token.length > 0);
        assert(rawToken === null || typeof rawToken.refresh_token === "string");
        assert(rawToken === null || rawToken.refresh_token.length > 0);
        assert(rawToken === null || typeof rawToken.expires_in === "number");
        assert(rawToken === null || typeof rawToken.scope === "string" || Array.isArray(rawToken.scope));
        // NOTE: could be empty if the token has no scopes.
        assert(rawToken === null || rawToken.scope.length > 0);

        return Promise.resolve()
            .then(() => {
                const storedAt = Date.now();
                let expiresApproximatelyAt = null;

                if (rawToken !== null) {
                    expiresApproximatelyAt = storedAt + rawToken.expires_in;
                }

                const userWithToken = {
                    username: username,
                    twitchToken: {
                        storedAt: storedAt,
                        expiresApproximatelyAt: expiresApproximatelyAt,
                        token: rawToken,
                    },
                };

                return this.store(userWithToken);
            })
            .tap((userAfterStoring) => {
                this._logger.trace(userAfterStoring, "storeToken");
            });
    }
}
