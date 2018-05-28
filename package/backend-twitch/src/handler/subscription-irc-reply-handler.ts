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

import IIncomingSubscriptionEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-subscription-event";

import IOutgoingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-irc-command";

@asrt(3)
export default class SubscriptionIrcReplyHandler extends EventSubscriptionManager<IIncomingSubscriptionEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IIncomingSubscriptionEvent>,
        @asrt() private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IIncomingSubscriptionEvent,
    ): Promise<void> {
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

    @asrt(1)
    protected async filter(
        @asrt() data: IIncomingSubscriptionEvent,
    ): Promise<boolean> {
        return true;
    }
}
