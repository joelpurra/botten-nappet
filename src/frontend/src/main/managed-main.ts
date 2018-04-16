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

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";

export default class FrontendManagedMain {
    private messageQueuePublisher: MessageQueuePublisher;
    private gracefulShutdownManager: GracefulShutdownManager;
    private logger: PinoLogger;
    private config: Config;

    constructor(
        config: Config,
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        messageQueuePublisher: MessageQueuePublisher,
    ) {
        // TODO: validate arguments.
        this.config = config;
        this.logger = logger.child(this.constructor.name);
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.messageQueuePublisher = messageQueuePublisher;
    }

    public async start(): Promise<void> {
        this.logger.info("Managed.");

        await this.gracefulShutdownManager.waitForShutdownSignal();

        // await applicationXYZ(
        //     config,
        //     this.logger,
        //     this.logger,
        //     gracefulShutdownManager,
        //     messageQueuePublisher,
        // );
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
    }
}
