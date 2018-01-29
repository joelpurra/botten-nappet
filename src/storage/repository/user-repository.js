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

const Document = require("camo").Document;

export default class UserRepository extends Document {
    constructor() {
        super();

        assert.strictEqual(arguments.length, 0);

        this.schema({
            username: {
                type: String,
                match: /^[a-z0-9][a-z0-9-]/i,
            },
            twitchToken: {
                type: Object,
                validate: (token) => {
                    // https://dev.twitch.tv/docs/authentication#oauth-authorization-code-flow-user-access-tokens
                    // const sampleResponse = {
                    //     "access_token": "0123456789abcdefghijABCDEFGHIJ",
                    //     "refresh_token": "eyJfaWQmNzMtNGCJ9%6VFV5LNrZFUj8oU231/3Aj",
                    //     "expires_in": 3600,
                    //     "scope": "viewing_activity_read",
                    // };

                    const isValid = (
                        token !== null
                          && typeof token === "object"
                          && (
                              Object.keys(token).length === 4
                              // NOTE: in case _id is counted.
                                || Object.keys(token).length === 5
                          )
                          && typeof token.access_token === "string"
                          && token.access_token.length > 0
                          && typeof token.refresh_token === "string"
                          && token.refresh_token.length > 0
                          && typeof token.expires_in === "number"
                          && token.expires_in > 0
                          && typeof token.scope === "string"
                          && token.scope.length > 0
                    );

                    return isValid;
                },
            },
        });
    }

    static collectionName() {
        return "user";
    }
}
