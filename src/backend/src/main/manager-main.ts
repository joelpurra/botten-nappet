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

import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";
import DatabaseConnection from "../storage/database-connection";

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueRawTopicsSubscriber from "@botten-nappet/shared/message-queue/raw-topics-subscriber";
import DistributedEventStorageManager from "../storage/manager/distributed-event-storage-manager";

/* tslint:disable max-line-length */
import TwitchApplicationTokenManager from "@botten-nappet/backend-twitch/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "@botten-nappet/backend-twitch/authentication/polling-application-token-connection";
/* tslint:enable max-line-length */

import TwitchCSRFHelper from "@botten-nappet/backend-twitch/helper/csrf-helper";
import TwitchRequestHelper from "@botten-nappet/backend-twitch/helper/request-helper";
import TwitchTokenHelper from "@botten-nappet/backend-twitch/helper/token-helper";

import DistributedEventManager from "../distributed-events/distributed-event-manager";
import DistributedEventRepository from "../storage/repository/distributed-event-repository";

import backendManagedMain from "./managed-main";
import BackendManagedMain from "./managed-main";

export default class BackendManagerMain implements IStartableStoppable {
    private backendManagedMain: backendManagedMain | null;
    private distributedEventManager: DistributedEventManager | null;
    private twitchApplicationTokenManager: TwitchApplicationTokenManager;
    private twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection;
    private twitchTokenHelper: TwitchTokenHelper;
    private twitchCSRFHelper: TwitchCSRFHelper;
    private twitchRequestHelper: TwitchRequestHelper;
    private messageQueuePublisher: MessageQueuePublisher;
    private messageQueueAllRawTopicsSubscriber: MessageQueueRawTopicsSubscriber;
    private databaseConnection: DatabaseConnection;
    private gracefulShutdownManager: GracefulShutdownManager;
    private config: Config;
    private logger: PinoLogger;

    constructor(
        config: Config,
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        databaseConnection: DatabaseConnection,
        messageQueueAllRawTopicsSubscriber: MessageQueueRawTopicsSubscriber,
        messageQueuePublisher: MessageQueuePublisher,
        twitchRequestHelper: TwitchRequestHelper,
        twitchCSRFHelper: TwitchCSRFHelper,
        twitchTokenHelper: TwitchTokenHelper,
        twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
        twitchApplicationTokenManager: TwitchApplicationTokenManager,
    ) {
        // TODO: validate arguments.
        this.config = config;
        this.logger = logger.child("BackendManagerMain");
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.databaseConnection = databaseConnection;
        this.messageQueueAllRawTopicsSubscriber = messageQueueAllRawTopicsSubscriber;
        this.messageQueuePublisher = messageQueuePublisher;
        this.twitchRequestHelper = twitchRequestHelper;
        this.twitchCSRFHelper = twitchCSRFHelper;
        this.twitchTokenHelper = twitchTokenHelper;
        this.twitchPollingApplicationTokenConnection = twitchPollingApplicationTokenConnection;
        this.twitchApplicationTokenManager = twitchApplicationTokenManager;

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

        const shutdown = async (incomingError?: Error) => {
            await this.stop();

            if (incomingError) {
                this.logger.error(incomingError, "Unmanaged.");

                throw incomingError;
            }

            this.logger.info("Unmanaged.");

            return undefined;
        };

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

        try {
            await this.backendManagedMain.start();

            await shutdown();
        } catch (error) {
            await shutdown(error);
        }
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
