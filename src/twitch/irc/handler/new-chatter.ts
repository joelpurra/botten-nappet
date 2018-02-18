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
import IIRCConnection from "../iirc-connection";
import IParsedMessage from "../iparsed-message";
import IrcManager from "../irc-manager";

export default class NewChatterIrcHandler extends IrcManager {
    constructor(logger: PinoLogger, connection: IIRCConnection) {
        super(logger, connection);

        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this._logger = logger.child("NewChatterIrcHandler");
    }

    public async _dataHandler(data: IParsedMessage): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const tags = data.tags!;
        const username = tags.login;
        const channel = data.channel;

        this._logger.trace("Responding to new chatter.", username, data.message, "_dataHandler");

        // TODO: use a string templating system.
        // TODO: configure message.
        const message = `PRIVMSG ${channel} :Hiya @${username}, welcome! Have a question? Go ahead and ask, I'll answer as soon as I see it. I'd be happy if you hang out with us, and don't forget to follow 😀`;

        // TODO: handle errors, re-reconnect, or shut down server?
        this._connection.send(message);
    }

    public async _filter(data: IParsedMessage): Promise<boolean> {
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
