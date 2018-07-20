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
import {
    assert,
} from "check-types";

import zmq from "zeromq-ng";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import ZmqConfig from "@botten-nappet/shared/src/config/zmq-config";
import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";

import {
    ZeroMqMessages,
} from "@botten-nappet/shared/src/message-queue/zeromq-types";

@asrt(2)
@autoinject
export default abstract class Proxy implements IConnectable {
    protected logger: PinoLogger;
    private xsubscriberSocket: zmq.XSubscriber | null = null;
    private xpublisherSocket: zmq.XPublisher | null = null;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly zmqConfig: ZmqConfig,
    ) {
        assert(zmq.capability.curve, "ZMQ lacks curve capability.");

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async connect(): Promise<void> {
        assert.equal(this.xsubscriberSocket, null);
        assert.equal(this.xpublisherSocket, null);

        const zmqXSubcriberOptions = {
            linger: 0,
        };

        const zmqXPublisherOptions = {
            linger: 0,
        };

        // NOTE: based on example by Tomasz Janczuk.
        // https://gist.github.com/tjanczuk/f133cc65977f5a8c4a7f
        this.xsubscriberSocket = new zmq.XSubscriber(zmqXSubcriberOptions);
        this.xsubscriberSocket.curveServer = true;
        this.xsubscriberSocket.curveSecretKey = this.zmqConfig.zmqServerPrivateKey;

        await this.xsubscriberSocket.bind(this.zmqConfig.zmqXSubscriberAddress);
        assert.equal(this.xsubscriberSocket.securityMechanism, "curve");

        this.xpublisherSocket = new zmq.XPublisher(zmqXPublisherOptions);
        this.xpublisherSocket.curveServer = true;
        this.xpublisherSocket.curveSecretKey = this.zmqConfig.zmqServerPrivateKey;

        await this.xpublisherSocket.bind(this.zmqConfig.zmqXPublisherAddress);
        assert.equal(this.xpublisherSocket.securityMechanism, "curve");

        // NOTE: listening outside of the async/await (promise) chain.
        this.listenXsubscriber();
        this.listenXpublisher();

        this.logger.debug("connected");
    }

    @asrt(0)
    public async disconnect(): Promise<void> {
        assert.not.equal(this.xsubscriberSocket, null);
        assert.not.equal(this.xpublisherSocket, null);

        await this.xsubscriberSocket!.disconnect(this.zmqConfig.zmqXSubscriberAddress);
        await this.xpublisherSocket!.disconnect(this.zmqConfig.zmqXPublisherAddress);
        await this.xsubscriberSocket!.close();
        await this.xpublisherSocket!.close();
        this.xsubscriberSocket = null;
        this.xpublisherSocket = null;

        this.logger.debug("disconnected");
    }

    @asrt(0)
    public async reconnect(): Promise<void> {
        await this.disconnect();
        await this.connect();
    }

    @asrt(0)
    public async isConnected(): Promise<boolean> {
        const connected = (
            this.xsubscriberSocket && !this.xsubscriberSocket.closed &&
            this.xpublisherSocket && !this.xpublisherSocket.closed
        ) || false;

        return connected;
    }

    @asrt(0)
    private async listenXsubscriber(): Promise<void> {
        assert.not.equal(this.xsubscriberSocket, null);
        assert.not.equal(this.xpublisherSocket, null);

        while (this.xsubscriberSocket && !this.xsubscriberSocket.closed) {
            try {
                const msgs: ZeroMqMessages = await this.xsubscriberSocket.receive();

                this.xpublisherSocket!.send(msgs);
            } catch (error) {
                if (error.code === "EAGAIN") {
                    // NOTE: ignoring errors when the xsubscriberSocket closes.
                    continue;
                }

                throw error;
            }
        }

        if (await this.isConnected()) {
            // TODO: reconnect if the socket should stay open?
            // TODO: avoid disconnection race condition.
            await this.disconnect();
        }
    }

    @asrt(0)
    private async listenXpublisher(): Promise<void> {
        assert.not.equal(this.xsubscriberSocket, null);
        assert.not.equal(this.xpublisherSocket, null);

        while (this.xpublisherSocket && !this.xpublisherSocket.closed) {
            try {
                const msgs: ZeroMqMessages = await this.xpublisherSocket.receive();

                this.xsubscriberSocket!.send(msgs);
            } catch (error) {
                if (error.code === "EAGAIN") {
                    // NOTE: ignoring errors when the xpublisherSocket closes.
                    continue;
                }

                throw error;
            }
        }

        if (await this.isConnected()) {
            // TODO: reconnect if the socket should stay open?
            // TODO: avoid disconnection race condition.
            await this.disconnect();
        }
    }
}
