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

const assert = require("assert");
const Promise = require("bluebird");

export default class PubSubManager {
    constructor(logger, pubSubConnection, userId, userAccessToken) {
        assert.strictEqual(arguments.length, 4);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof pubSubConnection, "object");
        assert(!isNaN(userId));
        assert(userId > 0);
        assert.strictEqual(typeof userAccessToken, "string");
        assert(userAccessToken.length > 0);

        this._logger = logger;
        this._pubSubConnection = pubSubConnection;
        this._userId = userId;
        this._userAccessToken = userAccessToken;

        // TODO: one class per listen-topic, or one class per concern?
        this._topics = [`channel-bits-events-v1.${this._userId}`, `channel-subscribe-events-v1.${this._userId}`, `channel-commerce-events-v1.${this._userId}`, `whispers.${this._userId}`];

        this._killSwitch = null;
    }

    start() {
        assert.strictEqual(arguments.length, 0);

        return this._pubSubConnection.listen(this._userAccessToken, this._topics, this._dataHandler.bind(this))
            .then((killSwitch) => {
                this._killSwitch = killSwitch;

                return undefined;
            })
            .tapCatch(() => this._executeKillSwitch());
    }

    stop() {
        assert.strictEqual(arguments.length, 0);

        // TODO: assert killSwitch?
        return Promise.try(() => {
            if (typeof this._killSwitch === "function") {
                this._executeKillSwitch();
            }
        });
    }

    _dataHandler(topic, data) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof topic, "string");
        assert(topic.length > 0);
        assert.strictEqual(typeof data, "object");

        this._logger.debug("dataHandler", topic, JSON.stringify(data, null, 2));
    }

    _executeKillSwitch() {
        assert.strictEqual(arguments.length, 0);

        return Promise.try(() => {
            if (typeof this._killSwitch !== "function") {
                return;
            }

            const killSwitch = this._killSwitch;
            this._killSwitch = null;
            killSwitch();
        });
    }
}
