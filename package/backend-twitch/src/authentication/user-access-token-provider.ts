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
    autoinject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import UserRawTokenProvider from "./user-raw-token-provider";

@autoinject
export default class UserAccessTokenProvider {
    constructor(
        private readonly userRawTokenProvider: UserRawTokenProvider,
    ) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof userRawTokenProvider, "object");
    }

    public async get(): Promise<string> {
        assert.hasLength(arguments, 0);

        const userRawToken = await this.userRawTokenProvider.get();

        // TODO: better null handling.
        if (userRawToken === null) {
            throw new Error("userAugmentedToken.token is null.");
        }

        return userRawToken.access_token;
    }
}
