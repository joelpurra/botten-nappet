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

export default async function backendManagerMain(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    databaseConnection: DatabaseConnection,
    messageQueueAllRawTopicsSubscriber: MessageQueueRawTopicsSubscriber,
    messageQueuePublisher: MessageQueuePublisher,
    twitchRequestHelper: TwitchRequestHelper,
    twitchCSRFHelper: TwitchCSRFHelper,
    twitchTokenHelper: TwitchTokenHelper,
    twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
    twitchApplicationTokenManager: TwitchApplicationTokenManager,
): Promise<void> {
    const backendManagerMainLogger = rootLogger.child("backendManagerMain");

    await databaseConnection.connect();
    await messageQueueAllRawTopicsSubscriber.connect();

    // TODO: ensure event distributed event manager starts sooner?
    const distributedEventStorageManager = new DistributedEventStorageManager(
        backendManagerMainLogger,
        DistributedEventRepository,
    );
    const distributedEventManager = new DistributedEventManager(
        backendManagerMainLogger,
        messageQueueAllRawTopicsSubscriber,
        distributedEventStorageManager,
    );

    await distributedEventManager.start();

    backendManagerMainLogger.info("Managed.");

    const shutdown = async (incomingError?: Error) => {
        await distributedEventManager.stop();
        await messageQueueAllRawTopicsSubscriber.disconnect();
        await databaseConnection.disconnect();

        if (incomingError) {
            backendManagerMainLogger.error(incomingError, "Unmanaged.");

            throw incomingError;
        }

        backendManagerMainLogger.info("Unmanaged.");

        return undefined;
    };

    try {
        await backendManagedMain(
            config,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            twitchRequestHelper,
            twitchCSRFHelper,
            twitchTokenHelper,
            twitchPollingApplicationTokenConnection,
            twitchApplicationTokenManager,
        );

        await shutdown();
    } catch (error) {
        shutdown(error);
    }
}
