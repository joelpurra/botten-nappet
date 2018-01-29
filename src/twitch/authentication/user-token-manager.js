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

export default class UserTokenManager {
    constructor(logger, tokenHelper, userTokenHelper) {
        assert.strictEqual(arguments.length, 3);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof tokenHelper, "object");
        assert.strictEqual(typeof userTokenHelper, "object");

        this._logger = logger.child("UserTokenManager");
        this._tokenHelper = tokenHelper;
        this._userTokenHelper = userTokenHelper;
    }

    async get(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        const userToken = await this._userTokenHelper.get(username);
        const isValid = await this._tokenHelper.validate(userToken);

        if (isValid) {
            return userToken;
        }

        const rawRefreshedToken = await this._userTokenHelper.refresh(userToken);
        const isRefreshedTokenValid = await this._tokenHelper.validate(rawRefreshedToken);

        if (isRefreshedTokenValid) {
            return this._userTokenHelper.store(username, rawRefreshedToken);
        }

        await this._userTokenHelper.forget(username);

        // TODO: user-wrappers with username for the generic token functions?
        await this._tokenHelper.revoke(rawRefreshedToken);

        // NOTE: recursive. Hope recursion ends at some point.
        return this.get(username);
    }
}
