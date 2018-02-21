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

interface ICommandAndResponse {
    [key: string]: string;
}

export default class TextResponseCommandIrcHandler extends IrcManager {
    private commandsAndResponses: ICommandAndResponse;
    private commandPrefix: string;

    constructor(logger: PinoLogger, connection: IIRCConnection) {
        super(logger, connection);

        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this.logger = logger.child("TextResponseCommandIrcHandler");

        this.commandPrefix = "!";
        this.commandsAndResponses = {
            // TODO: command aliases.
            bot: "For bot details see https://joelpurra.com/projects/botten-nappet/",
            commands: "For bot details see https://joelpurra.com/projects/botten-nappet/",
            help: "For bot details see https://joelpurra.com/projects/botten-nappet/",
        };
    }

    protected async dataHandler(data: IParsedMessage): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.logger.trace("Responding to command.", data.username, data.message, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure message.
        const tokenizedMessageParts = data.message!
            .toLowerCase()
            .split(/[^a-z]+/)
            .map((tokenizedPart) => tokenizedPart.trim())
            .filter((tokenizedPart) => tokenizedPart.length > 0);

        const incomingCommand = tokenizedMessageParts[0];

        // TODO: use command arguments for more advanced commands.
        // const incomingCommandArguments = tokenizedMessageParts.slice(1);

        const response = this.commandsAndResponses[incomingCommand];

        const message = `PRIVMSG ${data.channel} :@${data.username}: ${response}`;

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

        if (!data.message.startsWith(this.commandPrefix)) {
            return false;
        }

        const tokenizedMessageParts = data.message
            .toLowerCase()
            .split(/[^a-z]+/)
            .map((tokenizedPart) => tokenizedPart.trim())
            .filter((tokenizedPart) => tokenizedPart.length > 0);

        const incomingCommand = tokenizedMessageParts[0];
        const isKnownCommand = Object.keys(this.commandsAndResponses)
            .some((knownCommand) => incomingCommand === knownCommand);

        return isKnownCommand;
    }
}
