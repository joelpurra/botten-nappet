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

import zmq from "zeromq-ng";

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import IConnectable from "../connection/iconnectable";
import {
    ZeroMqMessage,
} from "./zeromq-types";

export default class Publisher implements IConnectable {
    private socket: any | null;
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        private address: string,
    ) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof address, "string");
        assert(address.length > 0);
        assert(address.startsWith("tcp://"));

        this.logger = logger.child(this.constructor.name);

        this.socket = null;
    }

    public async connect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.null(this.socket);

        const zmqPublisherOptions = {
            linger: 0,
        };

        this.socket = new zmq.Publisher(zmqPublisherOptions);
        await this.socket.bind(this.address);

        this.logger.debug("connected");
    }

    public async disconnect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.null(this.socket);

        await this.socket.unbind(this.address);
        await this.socket.close();

        this.socket = null;

        this.logger.debug("disconnected");
    }

    public async reconnect(): Promise<void> {
        assert.hasLength(arguments, 0);

        await this.disconnect();
        await this.connect();
    }

    public async send(topic: string, msg: ZeroMqMessage): Promise<void> {
        assert.not.null(this.socket);
        // TODO: better null handling.
        assert(!this.socket!.closed);

        await this.socket!.send([
            topic,
            msg,
        ]);
    }
}
