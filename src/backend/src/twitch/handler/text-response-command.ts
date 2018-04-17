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

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/event/event-subscription-manager";
import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/event/ievent-subscription-connection";

import IIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/iincoming-irc-command";
import IOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";

interface ICommandAndResponse {
    [key: string]: string;
}

export default class TextResponseCommandIrcHandler extends EventSubscriptionManager<IIncomingIrcCommand> {
    private commandsAndResponses: ICommandAndResponse;
    private commandPrefix: string;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingIrcCommand>,
        private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof outgoingIrcCommandEventEmitter, "object");

        this.logger = logger.child(this.constructor.name);

        this.commandPrefix = "!";
        this.commandsAndResponses = {
            // TODO: command aliases.
            bot: "For bot details see https://joelpurra.com/projects/botten-nappet/",
            commands: "For bot details see https://joelpurra.com/projects/botten-nappet/",
            help: "For bot details see https://joelpurra.com/projects/botten-nappet/",
        };
    }

    public async dataHandler(data: IIncomingIrcCommand): Promise<void> {
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

        const command: IOutgoingIrcCommand = {
            channel: data.channel,
            command: "PRIVMSG",
            message: `@${data.username}: ${response}`,
            tags: {},
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    public async filter(data: IIncomingIrcCommand): Promise<boolean> {
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
