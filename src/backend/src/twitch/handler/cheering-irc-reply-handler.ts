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

import IIncomingCheeringEvent from "@botten-nappet/interface-twitch/event/iincoming-cheering-event";

import IOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";

export default class CheeringIrcReplyHandler extends EventSubscriptionManager<IIncomingCheeringEvent> {
    private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingCheeringEvent>,
        outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof outgoingIrcCommandEventEmitter, "object");

        this.outgoingIrcCommandEventEmitter = outgoingIrcCommandEventEmitter;

        this.logger = logger.child("CheeringIrcReplyHandler");
    }

    protected async dataHandler(data: IIncomingCheeringEvent): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

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

    protected async filter(data: IIncomingCheeringEvent): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        return true;
    }
}
