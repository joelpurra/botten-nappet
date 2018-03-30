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
import IPubSubConnection from "../ipubsub-connection";
import IPubSubResponse from "../ipubsub-response";
import PubSubManager from "../pubsub-manager";

export default class PingPubSubHandler extends PubSubManager {
    public pubSubConnection: IPubSubConnection;
    private pingIntervalMilliseconds: number;
    private pingIntervalId: (number | NodeJS.Timer | null);

    constructor(logger: PinoLogger, connection: IPubSubConnection) {
        super(logger, connection);

        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this.logger = logger.child("PingPubSubHandler");
        this.pingIntervalId = null;
        this.pubSubConnection = this.connection as IPubSubConnection;

        // NOTE: minimum interval is a PING every 5 minutes.
        // https://dev.twitch.tv/docs/pubsub#connection-management
        this.pingIntervalMilliseconds = 4 * 60 * 1000;
    }

    public async start(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.equal(this.pingIntervalId, null);

        await super.start();

        // TODO: configure atBegin?
        await this.ping();

        // TODO: use an observable interval?
        this.pingIntervalId = setInterval(() => this.ping(), this.pingIntervalMilliseconds);
    }

    public async stop(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.equal(this.pingIntervalId, null);

        clearInterval(this.pingIntervalId as NodeJS.Timer);
        this.pingIntervalId = null;

        return super.stop();
    }

    protected async dataHandler(data: IPubSubResponse): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.logger.trace(data, "dataHandler");

        throw new Error("Unexpected call to dataHandler.");
    }

    protected async filter(data: IPubSubResponse): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        // TODO: check if the most recent ping was sent within 15 seconds, otherwise delay and reconnect.
        // TODO: backoff doubling for reconnects.
        // https://dev.twitch.tv/docs/pubsub#connection-management
        return false;
    }

    private async ping(): Promise<void> {
        assert.hasLength(arguments, 0);

        this.logger.trace("Sending ping", "ping");

        const message = {
            type: "PING",
        };

        // TODO: handle errors, re-reconnect, or shut down server?
        return this.pubSubConnection.send(message);
    }
}
