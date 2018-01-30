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

const {
    Document,
    EmbeddedDocument,
} = require("camo");

class RawToken extends EmbeddedDocument {
    constructor() {
        super();

        assert.strictEqual(arguments.length, 0);

        this.schema({
            access_token: {
                type: String,
                unique: true,
                required: true,
            },
            refresh_token: {
                type: String,
                unique: true,
                required: true,
            },
            expires_in: {
                type: Number,
                required: false,
            },
            scope: {
                // TODO: validate scope as a string or an array of strings>?
                type: [String],
                required: false,
            },
        });
    }
}

class AugmentedToken extends EmbeddedDocument {
    constructor() {
        super();

        assert.strictEqual(arguments.length, 0);

        this.schema({
            storedAt: {
                type: Number,
                min: 1,
                required: true,
            },
            expiresApproximatelyAt: {
                type: Number,
                min: 1,
                required: true,
            },
            token: {
                type: RawToken,
                required: false,
            },
        });
    }
}

export default class UserRepository extends Document {
    constructor() {
        super();

        assert.strictEqual(arguments.length, 0);

        this.schema({
            username: {
                type: String,
                match: /^[a-z0-9][a-z0-9-]/i,
                unique: true,
                required: true,
            },
            twitchToken: {
                type: AugmentedToken,
            },
        });
    }

    static collectionName() {
        return "user";
    }
}
