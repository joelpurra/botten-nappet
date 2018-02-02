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

import PubSubManager from "../pubsub-manager";

const assert = require("power-assert");

export default class LoggingPubSubHandler extends PubSubManager {
    constructor(logger, connection, userAccessTokenProvider, userId) {
        const topics = [
            `channel-bits-events-v1.${userId}`,
            `channel-subscribe-events-v1.${userId}`,
            `channel-commerce-events-v1.${userId}`,
            `whispers.${userId}`,
        ];

        super(logger, connection, userAccessTokenProvider, topics);

        assert.strictEqual(arguments.length, 4);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof connection, "object");
        assert.strictEqual(typeof userAccessTokenProvider, "function");
        assert(!isNaN(userId));
        assert(userId > 0);

        this._logger = logger.child("LoggingPubSubHandler");
    }

    async _dataHandler(topic, data) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof topic, "string");
        assert(topic.length > 0);
        assert.strictEqual(typeof data, "object");

        this._logger.trace(data, "_dataHandler");
    }

    async _filter(topic, data) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof topic, "string");
        assert(topic.length > 0);
        assert.strictEqual(typeof data, "object");

        return true;
    }
}
