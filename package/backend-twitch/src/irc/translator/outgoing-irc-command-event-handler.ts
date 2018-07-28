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
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";

import IOutgoingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-irc-command";
import IIRCConnection from "@botten-nappet/backend-twitch/src/irc/connection/iirc-connection";

@asrt(3)
export default class OutgoingIrcCommandEventHandler extends EventSubscriptionManager<IOutgoingIrcCommand> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IOutgoingIrcCommand>,
        @asrt() private readonly ircConnection: IIRCConnection,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    public async dataHandler(
        @asrt() data: IOutgoingIrcCommand
    ): Promise<void> {
        this.logger.trace(data, "handle");

        return this.ircConnection.send(data);
    }

    @asrt(1)
    public async filter(
        @asrt() data: IOutgoingIrcCommand
    ): Promise<boolean> {
        this.logger.trace(data, "filter");

        return true;
    }
}
