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
    asrt,
} from "@botten-nappet/shared/src/util/asrt";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";
import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";

import IIncomingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/iincoming-irc-command";
import IOutgoingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-irc-command";

interface ICommandAndResponse {
    [key: string]: string;
}

@asrt(3)
export default class TextResponseCommandIrcHandler extends EventSubscriptionManager<IIncomingIrcCommand> {
    private commandsAndResponses: ICommandAndResponse;
    private commandPrefix: string;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IIncomingIrcCommand>,
        @asrt() private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);

        this.commandPrefix = "!";
        this.commandsAndResponses = {
            // TODO: command aliases.
            bot: "For bot details see https://joelpurra.com/projects/botten-nappet/",
            commands: "For bot details see https://joelpurra.com/projects/botten-nappet/",
            help: "For bot details see https://joelpurra.com/projects/botten-nappet/",
        };
    }

    @asrt(1)
    public async dataHandler(
        @asrt() data: IIncomingIrcCommand,
    ): Promise<void> {
        this.logger.trace("Responding to command.", data.data.username, data.data.message, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure message.
        const tokenizedMessageParts = data.data.message!
            .toLowerCase()
            .split(/[^a-z]+/)
            .map((tokenizedPart) => tokenizedPart.trim())
            .filter((tokenizedPart) => tokenizedPart.length > 0);

        const incomingCommand = tokenizedMessageParts[0];

        // TODO: use command arguments for more advanced commands.
        // const incomingCommandArguments = tokenizedMessageParts.slice(1);

        const response = this.commandsAndResponses[incomingCommand];

        const command: IOutgoingIrcCommand = {
            channel: data.data.channel,
            command: "PRIVMSG",
            message: `@${data.data.username}: ${response}`,
            tags: {},
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    @asrt(1)
    public async filter(
        @asrt() data: IIncomingIrcCommand,
    ): Promise<boolean> {
        if (data.data.command !== "PRIVMSG") {
            return false;
        }

        if (typeof data.data.message !== "string") {
            return false;
        }

        if (!data.data.message.startsWith(this.commandPrefix)) {
            return false;
        }

        const tokenizedMessageParts = data.data.message
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
