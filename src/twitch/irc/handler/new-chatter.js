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

export default class NewChatterIrcHandler extends IrcManager {
    constructor(logger, connection) {
        super(logger, connection);

        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof connection, "object");

        this._logger = logger.child("NewChatterIrcHandler");
    }

    _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        this._logger.trace("Responding to new chatter.", data.tags.login, data.message, "_dataHandler");

        // TODO: use a string templating system.
        // TODO: configure message.
        this._connection._send(`PRIVMSG ${data.channel} :Hiya ${data.tags.login}, welcome! Have a question? Go ahead and ask, I'll answer as soon as I see it. I'd be happy if you hang out with us, and don't forget to follow 😀`);
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

            if (data.tags["msg-id"] !== "ritual") {
                return false;
            }

            if (data.tags["msg-param-ritual-name"] !== "new_chatter") {
                return false;
            }

            return true;
        });
    }
}
