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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IConnectable from "../connection/iconnectable";

import TopicConfig from "@botten-nappet/shared/src/config/topic-config";

import ISendingConnection from "../connection/isending-connection";
import IEventEmitter from "../event/ievent-emitter";
import Publisher from "./publisher";

@asrt(3)
export default abstract class TopicPublisher<T> implements IConnectable, ISendingConnection<T>, IEventEmitter<T> {
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly publisher: Publisher,
        @asrt() private readonly topicConfig: TopicConfig,
    ) {
        this.logger = logger.child(`${this.constructor.name} (${this.topicConfig.topic})`);
    }

    @asrt(0)
    public async connect(): Promise<void> {
        await this.publisher.connect();

        this.logger.debug("connected");
    }

    @asrt(0)
    public async disconnect(): Promise<void> {
        await this.publisher.disconnect();

        this.logger.debug("disconnected");
    }

    @asrt(0)
    public async reconnect(): Promise<void> {
        await this.publisher.reconnect();
    }

    @asrt(0)
    public async isConnected(): Promise<boolean> {
        const connected = (this.socket && !this.socket.closed) || false;

        return connected;
    }

    @asrt(1)
    public async send(
        @asrt() data: T,
    ): Promise<void> {
        let message = null;

        if (typeof data === "string") {
            message = data;
        } else {
            message = JSON.stringify(data);
        }

        // this.logger.trace(data, message, this.topicConfig.topic, "send");

        await this.publisher.send(
            this.topicConfig.topic,
            message,
        );
    }

    public async emit(data: T): Promise<void> {
        return this.send(data);
    }
}
