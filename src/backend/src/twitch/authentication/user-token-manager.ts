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
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import IAugmentedToken from "@botten-nappet/interface-twitch/authentication/iaugmented-token";

import TokenHelper from "../helper/token-helper";
import UserTokenHelper from "../helper/user-token-helper";

export default class UserTokenManager {
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        private readonly tokenHelper: TokenHelper,
        private readonly userTokenHelper: UserTokenHelper,
    ) {
        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof tokenHelper, "object");
        assert.equal(typeof userTokenHelper, "object");

        this.logger = logger.child(this.constructor.name);
    }

    public async get(username: string): Promise<IAugmentedToken> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof username, "string");
        assert(username.length > 0);

        const augmentedToken: IAugmentedToken = await this.userTokenHelper.get(username);
        let isValid = false;

        if (augmentedToken.token !== null) {
            isValid = await this.tokenHelper.validate(augmentedToken.token);
        }

        if (isValid) {
            return augmentedToken;
        }

        const rawRefreshedToken = await this.userTokenHelper.refresh(augmentedToken);
        const isRefreshedTokenValid = await this.tokenHelper.validate(rawRefreshedToken);

        if (isRefreshedTokenValid) {
            return this.userTokenHelper.store(username, rawRefreshedToken);
        }

        await this.userTokenHelper.forget(username);

        // TODO: user-wrappers with username for the generic token functions?
        await this.tokenHelper.revoke(rawRefreshedToken);

        // NOTE: recursive. Hope recursion ends at some point.
        return this.get(username);
    }
}
