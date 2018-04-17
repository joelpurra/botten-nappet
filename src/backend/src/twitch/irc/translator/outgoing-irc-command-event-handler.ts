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
import IEventSubscriptionConnection from "@botten-nappet/shared/event/ievent-subscription-connection";

import IOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";
import IIRCConnection from "../connection/iirc-connection";

export default class OutgoingIrcCommandEventHandler extends EventSubscriptionManager<IOutgoingIrcCommand> {
    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IOutgoingIrcCommand>,
        private readonly ircConnection: IIRCConnection,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof ircConnection, "object");

        this.logger = logger.child(this.constructor.name);
    }

    public async dataHandler(data: IOutgoingIrcCommand): Promise<void> {
        assert.equal(typeof data, "object");
        assert.not.null(data);

        this.logger.trace(data, "handle");

        return this.ircConnection.send(data);
    }

    public async filter(data: IOutgoingIrcCommand): Promise<boolean> {
        assert.equal(typeof data, "object");
        assert.not.null(data);

        this.logger.trace(data, "filter");

        return true;
    }
}
