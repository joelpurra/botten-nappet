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

import IEventEmitter from "../../../event/ievent-emitter";
import PinoLogger from "../../../util/pino-logger";
import IIncomingIrcCommand from "../command/iincoming-irc-command";
import IIRCConnection from "../iirc-connection";
import IrcManager from "../irc-manager";

export default class IncomingIrcCommandEventTranslator extends IrcManager {
    private incomingIrcCommandEventEmitter: IEventEmitter<IIncomingIrcCommand>;

    constructor(
        logger: PinoLogger,
        connection: IIRCConnection,
        incomingIrcCommandEventEmitter: IEventEmitter<IIncomingIrcCommand>,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingIrcCommandEventEmitter, "object");

        this.logger = logger.child("IncomingIrcCommandEventHandler");
        this.incomingIrcCommandEventEmitter = incomingIrcCommandEventEmitter;
    }

    protected async dataHandler(data: IIncomingIrcCommand): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.logger.trace(data, "dataHandler");

        this.incomingIrcCommandEventEmitter.emit(data);
    }

    protected async filter(data: IIncomingIrcCommand): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        return true;
    }
}
