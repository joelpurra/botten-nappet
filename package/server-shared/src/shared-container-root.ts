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

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import SharedConfig from "@botten-nappet/shared/src/config/shared-config";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";

import MessageQueuePublisher from "@botten-nappet/shared/src/message-queue/publisher";

import BackendMain from "@botten-nappet/server-backend/src/main/main";
import FrontendMain from "@botten-nappet/server-frontend/src/main/main";

@autoinject
export default class SharedContainerRoot implements IStartableStoppable {
    private logger: PinoLogger;

    constructor(
        private readonly sharedConfig: SharedConfig,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private readonly backendMain: BackendMain,
        private readonly frontendMain: FrontendMain,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    public async start(): Promise<void> {
        await this.gracefulShutdownManager.start();
        await this.messageQueuePublisher.connect();

        await Promise.all([
            this.backendMain.start(),
            this.frontendMain.start(),
        ]);
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await Promise.all([
            this.backendMain.stop(),
            this.frontendMain.stop(),
        ]);

        await this.messageQueuePublisher.disconnect();
        await this.gracefulShutdownManager.stop();
    }
}
