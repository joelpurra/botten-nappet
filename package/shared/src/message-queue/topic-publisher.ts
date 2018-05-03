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
    autoinject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IConnectable from "../connection/iconnectable";

import TopicConfig from "@botten-nappet/shared/src/config/topic-config";

import ISendingConnection from "../connection/isending-connection";
import IEventEmitter from "../event/ievent-emitter";
import Publisher from "./publisher";

@autoinject
export default abstract class TopicPublisher<T> implements IConnectable, ISendingConnection<T>, IEventEmitter<T> {
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        private readonly publisher: Publisher,
        private readonly topicConfig: TopicConfig,
    ) {
        // NOTE: not checking arguments length due to inheritance.
        assert.equal(typeof logger, "object");
        assert.equal(typeof publisher, "object");
        assert.equal(typeof topicConfig, "object");

        this.logger = logger.child(`${this.constructor.name} (${this.topicConfig})`);
    }

    public async connect(): Promise<void> {
        assert.hasLength(arguments, 0);

        await this.publisher.connect();

        this.logger.debug("connected");
    }

    public async disconnect(): Promise<void> {
        assert.hasLength(arguments, 0);

        await this.publisher.disconnect();

        this.logger.debug("disconnected");
    }

    public async reconnect(): Promise<void> {
        assert.hasLength(arguments, 0);

        await this.publisher.reconnect();
    }

    public async send(data: T): Promise<void> {
        assert.hasLength(arguments, 1);

        let message = null;

        if (typeof data === "string") {
            message = data;
        } else {
            message = JSON.stringify(data);
        }

        this.logger.trace(data, message, this.topicConfig, "send");

        await this.publisher.send(
            this.topicConfig.topic,
            message,
        );
    }

    public async emit(data: T): Promise<void> {
        return this.send(data);
    }
}
