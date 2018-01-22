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

import IrcManager from "../irc-manager";

const assert = require("power-assert");
const Promise = require("bluebird");

export default class SubscribingIrcHandler extends IrcManager {
    constructor(logger, connection) {
        super(logger, connection);

        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof connection, "object");

        this._logger = logger.child("SubscribingIrcHandler");
    }

    _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        this._logger.trace("Responding to subscriber.", data.tags.login, data.message, "_dataHandler");

        // TODO: use a string templating system.
        // TODO: configure message.
        let message = null;

        if (data.tags["msg-id"] === "resub") {
            message = `PRIVMSG ${data.channel} :Wow, ${data.tags.login}, thanks for getting your ${data.tags["msg-param-months"]} rubber duckies in a row!`;
        } else {
            message = `PRIVMSG ${data.channel} :Wow, ${data.tags.login}, thanks for being my rubber ducky!`;
        }

        this._connection._send(message);
    }

    _filter(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        return Promise.try(() => {
            if (typeof data !== "object") {
                return false;
            }

            if (data.command !== "USERNOTICE") {
                return false;
            }

            if (typeof data.tags["msg-id"] !== "string") {
                return false;
            }

            if (data.tags["msg-id"] !== "sub" && data.tags["msg-id"] !== "resub") {
                return false;
            }

            return true;
        });
    }
}
