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

import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";

import IOutgoingSearchCommand from "@botten-nappet/interface-shared-vidy/src/event/ioutgoing-search-command";
import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";

import IIncomingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/iincoming-irc-command";

@asrt(3)
export default class VidyCommandIrcHandler extends EventSubscriptionManager<IIncomingIrcCommand> {
    public resultLimit: number;
    private commandName: string;
    private commandPrefix: string;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IIncomingIrcCommand>,
        @asrt() private outgoingSearchCommandEventEmitter: IEventEmitter<IOutgoingSearchCommand>,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);

        this.commandPrefix = "!";
        this.commandName = "vidy";
        this.resultLimit = 10;
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

        // const incomingCommand = tokenizedMessageParts[0];
        const incomingCommandArguments = tokenizedMessageParts.slice(1);

        const query = incomingCommandArguments.join(" ");

        const command: IOutgoingSearchCommand = {
            limits: [
                this.resultLimit,
            ],
            q: query,
        };

        this.outgoingSearchCommandEventEmitter.emit(command);
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
        const isKnownCommand = incomingCommand === this.commandName;

        return isKnownCommand;
    }
}
