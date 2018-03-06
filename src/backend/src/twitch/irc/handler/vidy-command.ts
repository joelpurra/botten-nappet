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

import PinoLogger from "../../../../../shared/src/util/pino-logger";

import IEventEmitter from "../../../../../shared/src/event/ievent-emitter";

import EventSubscriptionManager from "../../../../../shared/src/event/event-subscription-manager";
import IEventSubscriptionConnection from "../../../../../shared/src/event/ievent-subscription-connection";
import IOutgoingSearchCommand from "../../../../vidy/command/ioutgoing-search-command";
import IIncomingIrcCommand from "../command/iincoming-irc-command";

export default class VidyCommandIrcHandler extends EventSubscriptionManager<IIncomingIrcCommand> {
    public resultLimit: number;
    private commandName: string;
    private outgoingSearchCommandEventEmitter: IEventEmitter<IOutgoingSearchCommand>;
    private commandPrefix: string;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingIrcCommand>,
        outgoingSearchCommandEventEmitter: IEventEmitter<IOutgoingSearchCommand>,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof outgoingSearchCommandEventEmitter, "object");

        this.logger = logger.child("VidyCommandIrcHandler");
        this.outgoingSearchCommandEventEmitter = outgoingSearchCommandEventEmitter;

        this.commandPrefix = "!";
        this.commandName = "vidy";
        this.resultLimit = 10;
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
        const isKnownCommand = incomingCommand === this.commandName;

        return isKnownCommand;
    }
}
