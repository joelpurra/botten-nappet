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

import IIncomingCheeringEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheering-event";

import IOutgoingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-irc-command";

@asrt(3)
export default class CheeringIrcReplyHandler extends EventSubscriptionManager<IIncomingCheeringEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IIncomingCheeringEvent>,
        @asrt() private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IIncomingCheeringEvent,
    ): Promise<void> {
        const username = data.triggerer.name;

        this.logger.trace("Responding to follower.", username, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure response.
        /* tslint:disable:max-line-length */
        const response = `Cheers times ${data.bits} @${username}! You've now cheered a grand total of ${data.total} bits 😀`;
        /* tslint:enable:max-line-length */

        const command: IOutgoingIrcCommand = {
            channel: `#${data.channel.name}`,
            command: "PRIVMSG",
            message: response,
            tags: {},
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IIncomingCheeringEvent,
    ): Promise<boolean> {
        return true;
    }
}
