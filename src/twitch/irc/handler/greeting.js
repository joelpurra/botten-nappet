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

export default class GreetingIrcHandler extends IrcManager {
    constructor(logger, connection, username) {
        super(logger, connection);

        assert.strictEqual(arguments.length, 3);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof connection, "object");
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        this._logger = logger.child("GreetingIrcHandler");
        this._username = username;

        this._greetings = [
            /\bhello\b/,
            /\bhi\b/,
            /\bhiya\b/,
            /\bhey\b/,
            /\bhowdy\b/,
            /\baloha\b/,
            /\b(o )?hai\b/,
            /\bgood (morning|evening|day)\b/,
            /\bwhat ?s up\b/,
            /\bwh?a+z+(u+p+)?\b/,
            /\byo\b/,
            /\bay+\b/,
        ];
    }

    async _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        this._logger.trace("Responding to greeting.", data.username, data.message, "_dataHandler");

        // TODO: use a string templating system.
        // TODO: configure message.
        let message = null;

        if (data.tags.subscriber === "1") {
            message = `PRIVMSG ${data.channel} :Hiya @${data.username}, loyal rubber ducky, how are you?`;
        } else {
            message = `PRIVMSG ${data.channel} :Hiya @${data.username}, how are you?`;
        }

        // TODO: handle errors, re-reconnect, or shut down server?
        this._connection._send(message);
    }

    async _filter(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        if (typeof data !== "object") {
            return false;
        }

        if (typeof data.message !== "string") {
            return false;
        }

        if (data.username === this._username) {
            return false;
        }

        const tokenizedMessage = data.message
            .toLowerCase()
            .split(/[^a-z]+/)
            .join(" ");

        const isGreeting = this._greetings.some((greeting) => {
            return greeting.test(tokenizedMessage);
        });

        return isGreeting;
    }
}
