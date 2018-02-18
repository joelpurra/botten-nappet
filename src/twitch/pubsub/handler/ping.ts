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
import IPubSubResponse from "../ipubsub-response";
import PubSubManager from "../pubsub-manager";

export default class PingPubSubHandler extends PubSubManager {
    public _pingIntervalMilliseconds: number;
    public _pingIntervalId: (number | NodeJS.Timer | null);

    constructor(logger: PinoLogger, connection: IPubSubConnection) {
        super(logger, connection);

        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this._logger = logger.child("PingPubSubHandler");
        this._pingIntervalId = null;

        // NOTE: minimum interval is a PING every 5 minutes.
        // https://dev.twitch.tv/docs/pubsub#connection-management
        this._pingIntervalMilliseconds = 4 * 60 * 1000;
    }

    public async start(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.equal(this._pingIntervalId, null);

        await super.start();

        // TODO: configure atBegin?
        await this._ping();

        // TODO: use an observable interval?
        this._pingIntervalId = setInterval(() => this._ping(), this._pingIntervalMilliseconds);
    }

    public async stop(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.equal(this._pingIntervalId, null);

        clearInterval(this._pingIntervalId as NodeJS.Timer);
        this._pingIntervalId = null;

        return super.stop();
    }

    public _ping(): Promise<void> {
        assert.hasLength(arguments, 0);

        this._logger.trace("Sending ping", "_ping");

        const message = {
            type: "PING",
        };

        // TODO: handle errors, re-reconnect, or shut down server?
        return this._connection.send(message);
    }

    public async _dataHandler(data: IPubSubResponse): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this._logger.trace(data, "_dataHandler");

        throw new Error("Unexpected call to _dataHandler.");
    }

    public async _filter(data: IPubSubResponse): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        // TODO: check if the most recent ping was sent within 15 seconds, otherwise delay and reconnect.
        // TODO: backoff doubling for reconnects.
        // https://dev.twitch.tv/docs/pubsub#connection-management
        return false;
    }
}
