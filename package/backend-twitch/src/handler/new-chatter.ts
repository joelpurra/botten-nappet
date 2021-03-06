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

@asrt(3)
export default class NewChatterIrcHandler extends EventSubscriptionManager<IIncomingIrcCommand> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IIncomingIrcCommand>,
        @asrt() private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IIncomingIrcCommand,
    ): Promise<void> {
        const tags = data.tags!;
        const username = tags.login;

        this.logger.trace("Responding to new chatter.", username, data.message, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure response.
        /* tslint:disable:max-line-length */
        const response = `Hiya @${username}, welcome! Have a question? Go ahead and ask, I'll answer as soon as I see it. I'd be happy if you hang out with us, and don't forget to follow 😀`;
        /* tslint:enable:max-line-length */

        const command: IOutgoingIrcCommand = {
            channel: data.channel,
            command: "PRIVMSG",
            message: response,
            tags: {},
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IIncomingIrcCommand,
    ): Promise<boolean> {
        if (data.command !== "USERNOTICE") {
            return false;
        }

        if (data.tags === null) {
            return false;
        }

        if (typeof data.tags !== "object") {
            return false;
        }

        if (typeof data.tags["msg-id"] !== "string") {
            return false;
        }

        if (data.tags["msg-id"] !== "ritual") {
            return false;
        }

        if (data.tags["msg-param-ritual-name"] !== "new_chatter") {
            return false;
        }

        return true;
    }
}
