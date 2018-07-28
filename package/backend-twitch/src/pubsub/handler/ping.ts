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
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IPubSubResponse from "@botten-nappet/interface-backend-twitch/src/event/ipubsub-response";

import IPubSubConnection from "@botten-nappet/backend-twitch/src/pubsub/connection/ipubsub-connection";
import PubSubManager from "@botten-nappet/backend-twitch/src/pubsub/connection/pubsub-manager";

@asrt(2)
export default class PingPubSubHandler extends PubSubManager {
    public pubSubConnection: IPubSubConnection;
    private pingIntervalMilliseconds: number;
    private pingIntervalId: (number | NodeJS.Timer | null);

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IPubSubConnection,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
        this.pingIntervalId = null;
        this.pubSubConnection = this.connection as IPubSubConnection;

        // NOTE: minimum interval is a PING every 5 minutes.
        // https://dev.twitch.tv/docs/pubsub#connection-management
        this.pingIntervalMilliseconds = 4 * 60 * 1000;
    }

    @asrt(0)
    public async start(): Promise<void> {
        assert.equal(this.pingIntervalId, null);

        await super.start();

        // TODO: configure atBegin?
        await this.ping();

        // TODO: use an observable interval?
        this.pingIntervalId = setInterval(() => this.ping(), this.pingIntervalMilliseconds);
    }

    @asrt(0)
    public async stop(): Promise<void> {
        assert.not.equal(this.pingIntervalId, null);

        clearInterval(this.pingIntervalId as NodeJS.Timer);
        this.pingIntervalId = null;

        return super.stop();
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IPubSubResponse,
    ): Promise<void> {
        this.logger.trace(data, "dataHandler");

        throw new Error("Unexpected call to dataHandler.");
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IPubSubResponse,
    ): Promise<boolean> {
        // TODO: check if the most recent ping was sent within 15 seconds, otherwise delay and reconnect.
        // TODO: backoff doubling for reconnects.
        // https://dev.twitch.tv/docs/pubsub#connection-management
        return false;
    }

    @asrt(0)
    private async ping(): Promise<void> {
        this.logger.trace("Sending ping", "ping");

        const message = {
            type: "PING",
        };

        // TODO: handle errors, re-reconnect, or shut down server?
        return this.pubSubConnection.send(message);
    }
}
