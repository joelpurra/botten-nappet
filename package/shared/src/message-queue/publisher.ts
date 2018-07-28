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
    autoinject,
} from "aurelia-framework";
import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import zmq from "zeromq-ng";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import ZmqConfig from "@botten-nappet/shared/src/config/zmq-config";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import {
    ZeroMqMessage,
} from "@botten-nappet/shared/src/message-queue/zeromq-types";

@asrt(2)
@autoinject
export default class Publisher implements IConnectable {
    private socket: any | null = null;
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly zmqConfig: ZmqConfig,
    ) {
        assert(zmq.capability.curve, "ZMQ lacks curve capability.");

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async connect(): Promise<void> {
        assert.null(this.socket);

        const zmqPublisherOptions = {
            linger: 0,
        };

        this.socket = new zmq.Publisher(zmqPublisherOptions);

        this.socket.curveSecretKey = this.zmqConfig.zmqClientPrivateKey;
        this.socket.curvePublicKey = this.zmqConfig.zmqClientPublicKey;
        this.socket.curveServerKey = this.zmqConfig.zmqServerPublicKey;

        await this.socket.connect(this.zmqConfig.zmqXSubscriberAddress);
        assert.equal(this.socket.securityMechanism, "curve");

        this.logger.debug("connected");
    }

    @asrt(0)
    public async disconnect(): Promise<void> {
        assert.not.null(this.socket);

        // TODO HACK REMOVE: trying to reduce crashes during shutdown in other parts of
        // the application by letting the internal pubsub messaging live a slight bit longer.
        await Bluebird.delay(1000);

        await this.socket.disconnect(this.zmqConfig.zmqXSubscriberAddress);
        await this.socket.close();

        this.socket = null;

        this.logger.debug("disconnected");
    }

    @asrt(0)
    public async reconnect(): Promise<void> {
        await this.disconnect();
        await this.connect();
    }

    @asrt(0)
    public async isConnected(): Promise<boolean> {
        const connected = (this.socket && !this.socket.closed) || false;

        return connected;
    }

    @asrt(2)
    public async send(
        @asrt() topic: string,
        @asrt() msg: ZeroMqMessage,
    ): Promise<void> {
        if (!await this.isConnected()) {
            this.logger.warn(topic, msg, "Could not send message; not connected.");

            // TODO: make sure all messages get sent?
            // // TODO HACK REMOVE: trying to reduce crashes during shutdown in other parts of
            // // the application by letting the internal pubsub messaging live a slight bit longer.
            // await Bluebird.delay(100);
            //
            // assert(false, `Could not send message; not connected: ${
            //     topic
            //     } (cirka ${
            //     JSON.stringify(msg).length
            //     } characters in message object)`,
            // );
        }

        await this.socket!.send([
            topic,
            msg,
        ]);
    }
}
