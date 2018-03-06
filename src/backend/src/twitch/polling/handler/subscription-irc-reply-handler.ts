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

import EventSubscriptionManager from "../../../../../shared/src/event/event-subscription-manager";
import IEventEmitter from "../../../../../shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "../../../../../shared/src/event/ievent-subscription-connection";
import PinoLogger from "../../../../../shared/src/util/pino-logger";
import IOutgoingIrcCommand from "../../irc/command/ioutgoing-irc-command";
import IIncomingSubscriptionEvent from "../event/iincoming-subscription-event";

export default class SubscriptionIrcReplyHandler extends EventSubscriptionManager<IIncomingSubscriptionEvent> {
    private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingSubscriptionEvent>,
        outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof outgoingIrcCommandEventEmitter, "object");

        this.outgoingIrcCommandEventEmitter = outgoingIrcCommandEventEmitter;

        this.logger = logger.child("SubscriptionIrcReplyHandler");
    }

    protected async dataHandler(data: IIncomingSubscriptionEvent): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const username = data.triggerer.name;

        this.logger.trace("Responding to subscriber.", username, data.message, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure response.
        let response = null;

        if (data.months > 0) {
            /* tslint:disable:max-line-length */
            response = `Wow, @${username}, thanks for getting your ${data.months} rubber duckies in a row!`;
            /* tslint:enable:max-line-length */
        } else {
            response = `Wow, @${username}, thanks for becoming my newest rubber ducky!`;
        }

        const command: IOutgoingIrcCommand = {
            channel: `#${data.channel.name}`,
            command: "PRIVMSG",
            message: `${response}`,
            tags: {},
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    protected async filter(data: IIncomingSubscriptionEvent): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        return true;
    }
}
