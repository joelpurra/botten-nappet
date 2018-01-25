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

import PinoLogger from "../../../util/pino-logger";
import IIncomingIrcCommand from "../command/iincoming-irc-command";
import IIRCConnection from "../iirc-connection";
import IrcManager from "../irc-manager";

export default class SubscribingIrcHandler extends IrcManager {
    constructor(logger: PinoLogger, connection: IIRCConnection) {
        super(logger, connection);

        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this.logger = logger.child("SubscribingIrcHandler");
    }

    protected async dataHandler(data: IIncomingIrcCommand): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const tags = data.tags!;
        const username = tags.login;

        this.logger.trace("Responding to subscriber.", username, data.message, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure message.
        let message = null;

        const msgId = tags["msg-id"];
        const msgParamMonths = tags["msg-param-months"];

        if (msgId === "resub") {
            /* tslint:disable:max-line-length */
            message = `PRIVMSG ${data.channel} :Wow, @${username}, thanks for getting your ${msgParamMonths} rubber duckies in a row!`;
            /* tslint:enable:max-line-length */
        } else {
            message = `PRIVMSG ${data.channel} :Wow, @${username}, thanks for becoming my newest rubber ducky!`;
        }

        // TODO: handle errors, re-reconnect, or shut down server?
        this.connection.send(message);
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
