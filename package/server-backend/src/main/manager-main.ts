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

/* tslint:disable max-line-length */

import {
    context,
} from "@botten-nappet/backend-shared/lib/dependency-injection/context/context";
import {
    scoped,
} from "@botten-nappet/backend-shared/lib/dependency-injection/scoped/scoped";
import {
    asrt,
} from "@botten-nappet/shared/src/util/asrt";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import DatabaseConnection from "@botten-nappet/backend-shared/src/storage/database-connection";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import MessageQueueExternalRawTopicsSubscriber from "../message-queue/external-raw-topics-subscriber";

import ExternalDistributedEventManager from "../distributed-events/external-distributed-event-manager";

import BackendManagedMain from "./managed-main";

/* tslint:enable max-line-length */

@asrt(5)
export default class BackendManagerMain implements IStartableStoppable {
    private logger: PinoLogger;

    constructor(
        @asrt() @context(BackendManagedMain, "BackendManagedMain")
        private readonly backendManagedMain: () => BackendManagedMain,
        @asrt() logger: PinoLogger,
        @asrt() private readonly databaseConnection: DatabaseConnection,
        @asrt() private readonly messageQueueExternalRawTopicsSubscriber: MessageQueueExternalRawTopicsSubscriber,
        @asrt() @scoped(ExternalDistributedEventManager)
        private readonly externalDistributedEventManager: ExternalDistributedEventManager,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async start(): Promise<void> {
        await this.databaseConnection.connect();
        await this.messageQueueExternalRawTopicsSubscriber.connect();

        // TODO: ensure event distributed event manager starts sooner?
        await this.externalDistributedEventManager.start();

        this.logger.info("Managed.");

        await this.backendManagedMain().start();
    }

    @asrt(0)
    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.backendManagedMain) {
            await this.backendManagedMain().stop();
        }

        if (this.externalDistributedEventManager) {
            await this.externalDistributedEventManager.stop();
        }

        await this.messageQueueExternalRawTopicsSubscriber.disconnect();
        await this.databaseConnection.disconnect();
    }
}
