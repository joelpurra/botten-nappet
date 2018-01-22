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

import ConnectionManager from "../connection-manager";

const assert = require("power-assert");

export default class PubSubManager extends ConnectionManager {
    constructor(logger, connection, userAccessToken, topics) {
        super(logger, connection);

        assert.strictEqual(arguments.length, 4);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof connection, "object");
        assert.strictEqual(typeof userAccessToken, "string");
        assert(userAccessToken.length > 0);
        assert(Array.isArray(topics));
        assert(topics.length > 0);

        this._logger = logger.child("PubSubManager");
        this._userAccessToken = userAccessToken;
        this._topics = topics;
    }

    start() {
        assert.strictEqual(arguments.length, 0);

        return super.start(this._userAccessToken, this._topics);
    }
}
