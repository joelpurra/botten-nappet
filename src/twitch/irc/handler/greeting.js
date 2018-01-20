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

const assert = require("assert");
const Promise = require("bluebird");

export default class GreetingIrcHandler extends IrcManager {
    constructor(logger, ircConnection) {
        super(logger, ircConnection);

        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof ircConnection, "object");

        this._logger = logger.child("GreetingIrcHandler");

        this._greetings = [
            /\bhello\b/,
            /\bhi\b/,
            /\bhey\b/,
            /\bgood (morning|evening|day)\b/,
            /\bwhat ?s up\b/,
        ];
    }

    _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        this._logger.trace("Responding to greeting.", data.username, data.message, "_dataHandler");

        // TODO: use a string templating system.
        // TODO: configure greeting message.
        this._ircConnection._send(`PRIVMSG ${data.channel} :Hiya ${data.username}, welcome! Have a question? Go ahead and ask, I'll answer as soon as I see it. I'd be happy if you hang out with us, and don't forget to follow 😀`);
    }

    _filter(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        return Promise.try(() => {
            if (typeof data !== "object") {
                return false;
            }

            if (typeof data.message !== "string") {
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
        });
    }
}
