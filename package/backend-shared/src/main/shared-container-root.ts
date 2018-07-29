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
    inject,
} from "aurelia-dependency-injection";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import MessageQueuePublisher from "@botten-nappet/shared/src/message-queue/publisher";
import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import {
    IRealRoot,
} from "@botten-nappet/backend-shared/src/main/ireal-root";

@asrt(4)
export default class SharedContainerRoot implements IStartableStoppable {
    constructor(
        @asrt() private readonly logger: PinoLogger,
        @asrt() private readonly gracefulShutdownManager: GracefulShutdownManager,
        @asrt() private readonly messageQueuePublisher: MessageQueuePublisher,
        @asrt() @inject("IRealRoot")
        private readonly realRoot: IRealRoot,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async start(): Promise<void> {
        await this.gracefulShutdownManager.start();
        await this.messageQueuePublisher.connect();

        await this.realRoot.start();

        this.logger.info("Started.");
    }

    @asrt(0)
    public async stop(): Promise<void> {
        this.logger.info("Stopping.");

        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await this.realRoot.stop();

        await this.messageQueuePublisher.disconnect();
        await this.gracefulShutdownManager.stop();

        this.logger.info("Stopped.");
    }
}
