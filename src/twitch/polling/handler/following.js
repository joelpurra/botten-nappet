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

import PollingManager from "../polling-manager";

const assert = require("power-assert");
const Promise = require("bluebird");

export default class FollowingPollingHandler extends PollingManager {
    constructor(logger, connection, ircConnection, ircChannel) {
        super(logger, connection);

        assert.strictEqual(arguments.length, 4);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof connection, "object");
        assert.strictEqual(typeof ircConnection, "object");
        assert.strictEqual(typeof ircChannel, "string");
        assert(ircChannel.startsWith("#"));
        assert(ircChannel.length > 1);

        this._ircConnection = ircConnection;
        this._ircChannel = ircChannel;

        this._logger = logger.child("FollowingPollingHandler");
        this._lastFollowingMessageTimestamp = Date.now();
    }

    _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        const newFollows = this._getNewFollows(data.follows, this._lastFollowingMessageTimestamp);

        this._lastFollowingMessageTimestamp = Date.now();

        newFollows.forEach((follow) => {
            this._logger.trace("Responding to follower.", follow.user.name, "_dataHandler");

            // TODO: use a string templating system.
            // TODO: configure message.
            const message = `PRIVMSG ${this._ircChannel} :Hey ${follow.user.name}, thanks for following! Hope to see you next live stream 😀`;

            this._ircConnection._send(message);
        });
    }

    _filter(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        return Promise.try(() => {
            if (typeof data !== "object") {
                return false;
            }

            if (!Array.isArray(data.follows)) {
                return false;
            }

            const newFollows = this._getNewFollows(data.follows, this._lastFollowingMessageTimestamp);

            const shouldHandle = newFollows.length > 0;

            return shouldHandle;
        });
    }

    _getNewFollows(follows, since) {
        const newFollows = follows.filter((follow) => {
            const followedAt = Date.parse(follow.created_at);

            const isNewFollow = (followedAt > since);

            return isNewFollow;
        });

        return newFollows;
    }
}
