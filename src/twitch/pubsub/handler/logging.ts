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
import IPubSubConnection from "../ipubsub-connection";
import PubSubManager from "../pubsub-manager";

export default class LoggingPubSubHandler extends PubSubManager {
    constructor(logger: PinoLogger, connection: IPubSubConnection) {
        super(logger, connection);

        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this._logger = logger.child("LoggingPubSubHandler");
    }

    public async _dataHandler(data: object): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        // TODO: verify that the data contains both the topic and the actual message data.
        this._logger.trace(data, "_dataHandler");
    }

    public async _filter(data: object): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        // TODO: verify that the data contains both the topic and the actual message data.
        return true;
    }
}