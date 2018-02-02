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
import IConnection from "../../iconnection";
import PubSubManager from "../pubsub-manager";

export default class LoggingPubSubHandler extends PubSubManager {
    constructor(logger: PinoLogger, connection: IConnection, userAccessTokenProvider, userId: number) {
        const topics = [
            `channel-bits-events-v1.${userId}`,
            `channel-subscribe-events-v1.${userId}`,
            `channel-commerce-events-v1.${userId}`,
            `whispers.${userId}`,
        ];

        super(logger, connection, userAccessTokenProvider, topics);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof userAccessTokenProvider, "function");
        assert.number(userId);
        assert.greater(userId, 0);

        this._logger = logger.child("LoggingPubSubHandler");
    }

    public async _dataHandler(topic: string, data: object) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof topic, "string");
        assert.greater(topic.length, 0);
        assert.equal(typeof data, "object");

        this._logger.trace(data, "_dataHandler");
    }

    public async _filter(topic: string, data: object) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof topic, "string");
        assert.greater(topic.length, 0);
        assert.equal(typeof data, "object");

        return true;
    }
}
