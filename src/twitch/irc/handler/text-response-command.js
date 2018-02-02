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

export default class TextResponseCommandIrcHandler extends IrcManager {
    constructor(logger, connection) {
        super(logger, connection);

        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof connection, "object");

        this._logger = logger.child("TextResponseCommandIrcHandler");

        this._commandPrefix = "!";
        this._commandsAndResponses = {
            // TODO: command aliases.
            help: "For bot details see https://joelpurra.com/projects/botten-nappet/",
            commands: "For bot details see https://joelpurra.com/projects/botten-nappet/",
            bot: "For bot details see https://joelpurra.com/projects/botten-nappet/",
        };
    }

    async _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        this._logger.trace("Responding to command.", data.username, data.message, "_dataHandler");

        // TODO: use a string templating system.
        // TODO: configure message.
        const tokenizedMessageParts = data.message
            .toLowerCase()
            .split(/[^a-z]+/)
            .map((tokenizedPart) => tokenizedPart.trim())
            .filter((tokenizedPart) => tokenizedPart.length > 0);

        const incomingCommand = tokenizedMessageParts[0];

        // TODO: use command arguments for more advanced commands.
        // const incomingCommandArguments = tokenizedMessageParts.slice(1);

        const response = this._commandsAndResponses[incomingCommand];

        const message = `PRIVMSG ${data.channel} :@${data.username}: ${response}`;

        // TODO: handle errors, re-reconnect, or shut down server?
        this._connection._send(message);

        return message;
    }

    async _filter(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        if (typeof data !== "object") {
            return false;
        }

        if (data.command !== "PRIVMSG") {
            return false;
        }

        if (typeof data.message !== "string") {
            return false;
        }

        if (!data.message.startsWith(this._commandPrefix)) {
            return false;
        }

        const tokenizedMessageParts = data.message
            .toLowerCase()
            .split(/[^a-z]+/)
            .map((tokenizedPart) => tokenizedPart.trim())
            .filter((tokenizedPart) => tokenizedPart.length > 0);

        const incomingCommand = tokenizedMessageParts[0];
        const isKnownCommand = Object.keys(this._commandsAndResponses).some((knownCommand) => incomingCommand === knownCommand);

        return isKnownCommand;
    }
}
