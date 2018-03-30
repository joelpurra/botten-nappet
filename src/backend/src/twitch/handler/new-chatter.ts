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

import IIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/iincoming-irc-command";
import IOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";

export default class NewChatterIrcHandler extends EventSubscriptionManager<IIncomingIrcCommand> {
    private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingIrcCommand>,
        outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof outgoingIrcCommandEventEmitter, "object");

        this.logger = logger.child("NewChatterIrcHandler");
        this.outgoingIrcCommandEventEmitter = outgoingIrcCommandEventEmitter;
    }

    protected async dataHandler(data: IIncomingIrcCommand): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

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

    protected async filter(data: IIncomingIrcCommand): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

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
