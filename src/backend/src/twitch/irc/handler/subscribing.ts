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
import IIncomingIrcCommand from "../command/iincoming-irc-command";
import IOutgoingIrcCommand from "../command/ioutgoing-irc-command";

export default class SubscribingIrcHandler extends EventSubscriptionManager<IIncomingIrcCommand> {
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

        this.logger = logger.child("SubscribingIrcHandler");
        this.outgoingIrcCommandEventEmitter = outgoingIrcCommandEventEmitter;
    }

    protected async dataHandler(data: IIncomingIrcCommand): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const tags = data.tags!;
        const username = tags.login;

        this.logger.trace("Responding to subscriber.", username, data.message, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure response.
        let response = null;

        const msgId = tags["msg-id"];
        const msgParamMonths = tags["msg-param-months"];

        if (msgId === "resub") {
            /* tslint:disable:max-line-length */
            response = `Wow, @${username}, thanks for getting your ${msgParamMonths} rubber duckies in a row!`;
            /* tslint:enable:max-line-length */
        } else {
            response = `Wow, @${username}, thanks for becoming my newest rubber ducky!`;
        }

        const command: IOutgoingIrcCommand = {
            channel: data.channel,
            command: "PRIVMSG",
            message: `${response}`,
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

        const tags = data.tags;

        if (tags === null) {
            return false;
        }

        if (typeof tags !== "object") {
            return false;
        }

        const msgId = tags["msg-id"];

        if (typeof msgId !== "string") {
            return false;
        }

        if (msgId !== "sub" && msgId !== "resub") {
            return false;
        }

        return true;
    }
}