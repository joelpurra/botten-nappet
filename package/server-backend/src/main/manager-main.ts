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

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import Config from "@botten-nappet/backend-shared/src/config/config";
import DatabaseConnection from "@botten-nappet/backend-shared/src/storage/database-connection";
import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import DistributedEventStorageManager from "@botten-nappet/backend-shared/src/storage/manager/distributed-event-storage-manager";
import MessageQueuePublisher from "@botten-nappet/shared/src/message-queue/publisher";
import MessageQueueRawTopicsSubscriber from "@botten-nappet/shared/src/message-queue/raw-topics-subscriber";

import TwitchApplicationTokenManager from "@botten-nappet/backend-twitch/src/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "@botten-nappet/backend-twitch/src/authentication/polling-application-token-connection";

import TwitchCSRFHelper from "@botten-nappet/backend-twitch/src/helper/csrf-helper";
import TwitchRequestHelper from "@botten-nappet/backend-twitch/src/helper/request-helper";
import TwitchTokenHelper from "@botten-nappet/backend-twitch/src/helper/token-helper";

import DistributedEventManager from "@botten-nappet/backend-shared/src/distributed-events/distributed-event-manager";
import DistributedEventRepository from "@botten-nappet/backend-shared/src/storage/repository/distributed-event-repository";

import backendManagedMain from "./managed-main";
import BackendManagedMain from "./managed-main";

/* tslint:enable max-line-length */

export default class BackendManagerMain implements IStartableStoppable {
    private backendManagedMain: backendManagedMain | null;
    private distributedEventManager: DistributedEventManager | null;
    private logger: PinoLogger;

    constructor(
        private readonly config: Config,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly databaseConnection: DatabaseConnection,
        private readonly messageQueueAllRawTopicsSubscriber: MessageQueueRawTopicsSubscriber,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private readonly twitchRequestHelper: TwitchRequestHelper,
        private readonly twitchCSRFHelper: TwitchCSRFHelper,
        private readonly twitchTokenHelper: TwitchTokenHelper,
        private readonly twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
        private readonly twitchApplicationTokenManager: TwitchApplicationTokenManager,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.distributedEventManager = null;
        this.backendManagedMain = null;
    }

    public async start(): Promise<void> {
        await this.databaseConnection.connect();
        await this.messageQueueAllRawTopicsSubscriber.connect();

        // TODO: ensure event distributed event manager starts sooner?
        const distributedEventStorageManager = new DistributedEventStorageManager(
            this.logger,
            DistributedEventRepository,
        );
        this.distributedEventManager = new DistributedEventManager(
            this.logger,
            this.messageQueueAllRawTopicsSubscriber,
            distributedEventStorageManager,
        );

        await this.distributedEventManager.start();

        this.logger.info("Managed.");

        this.backendManagedMain = new BackendManagedMain(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            this.twitchRequestHelper,
            this.twitchCSRFHelper,
            this.twitchTokenHelper,
            this.twitchPollingApplicationTokenConnection,
            this.twitchApplicationTokenManager,
        );

        await this.backendManagedMain.start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.backendManagedMain) {
            await this.backendManagedMain.stop();
        }

        if (this.distributedEventManager) {
            await this.distributedEventManager.stop();
        }

        await this.messageQueueAllRawTopicsSubscriber.disconnect();
        await this.databaseConnection.disconnect();
    }
}
