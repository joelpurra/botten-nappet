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

import {
    assert,
} from "check-types";

import PinoLogger from "../../../util/pino-logger";
import IIRCConnection from "../iirc-connection";
import IParsedMessage from "../iparsed-message";
import IrcManager from "../irc-manager";

export default class GreetingIrcHandler extends IrcManager {
    private greetings: RegExp[];
    private username: string;

    constructor(logger: PinoLogger, connection: IIRCConnection, username: string) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof username, "string");
        assert.greater(username.length, 0);

        this.logger = logger.child("GreetingIrcHandler");
        this.username = username;

        this.greetings = [
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

    protected async dataHandler(data: IParsedMessage): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.logger.trace("Responding to greeting.", data.username, data.message, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure message.
        let message = null;

        if (data.tags!.subscriber === "1") {
            message = `PRIVMSG ${data.channel} :Hiya @${data.username}, loyal rubber ducky, how are you?`;
        } else {
            message = `PRIVMSG ${data.channel} :Hiya @${data.username}, how are you?`;
        }

        // TODO: handle errors, re-reconnect, or shut down server?
        this.connection.send(message);
    }

    protected async filter(data: IParsedMessage): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (data.command !== "PRIVMSG") {
            return false;
        }

        if (typeof data.message !== "string") {
            return false;
        }

        if (data.username === this.username) {
            return false;
        }

        const tokenizedMessage = data.message
            .toLowerCase()
            .split(/[^a-z]+/)
            .map((tokenizedPart) => tokenizedPart.trim())
            .filter((tokenizedPart) => tokenizedPart.length > 0)
            .join(" ")
            .trim();

        const isGreeting = this.greetings.some((greeting) => {
            return greeting.test(tokenizedMessage);
        });

        return isGreeting;
    }
}
