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

import configLibrary from "config";

import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";

import FrontendManagerMain from "./manager-main";

export default class FrontendMain implements IStartableStoppable {
    private frontendManagerMain: FrontendManagerMain | null;
    private messageQueuePublisher: MessageQueuePublisher;
    private gracefulShutdownManager: GracefulShutdownManager;
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        messageQueuePublisher: MessageQueuePublisher,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child("frontend");
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.messageQueuePublisher = messageQueuePublisher;

        this.frontendManagerMain = null;
    }

    public async start(): Promise<void> {
        const config = new Config(configLibrary);

        config.validate();

        this.frontendManagerMain = new FrontendManagerMain(
            config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
        );

        await this.frontendManagerMain.start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await this.frontendManagerMain!.stop();
    }
}
