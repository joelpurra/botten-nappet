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

import GracefulShutdownManager from "../../../shared/src/util/graceful-shutdown-manager";
import PinoLogger from "../../../shared/src/util/pino-logger";
import Config from "../config/config";
import DatabaseConnection from "../storage/database-connection";

import MessageQueuePublisher from "../../../shared/src/message-queue/publisher";
import MessageQueueRawTopicsSubscriber from "../../../shared/src/message-queue/raw-topics-subscriber";
import DistributedEventStorageManager from "../storage/manager/distributed-event-storage-manager";

import TwitchApplicationTokenManager from "../twitch/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "../twitch/authentication/polling-application-token-connection";

import TwitchCSRFHelper from "../twitch/helper/csrf-helper";
import TwitchRequestHelper from "../twitch/helper/request-helper";
import TwitchTokenHelper from "../twitch/helper/token-helper";

import DistributedEventManager from "../distributed-events/distributed-event-manager";
import DistributedEventRepository from "../storage/repository/distributed-event-repository";
import managedMain from "./managed-main";

export default async function managerMain(
    config: Config,
    mainLogger: PinoLogger,
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
    await databaseConnection.connect();
    await messageQueueAllRawTopicsSubscriber.connect();

    // TODO: ensure event distributed event manager starts sooner?
    const distributedEventStorageManager = new DistributedEventStorageManager(
        mainLogger,
        DistributedEventRepository,
    );
    const distributedEventManager = new DistributedEventManager(
        mainLogger,
        messageQueueAllRawTopicsSubscriber,
        distributedEventStorageManager,
    );

    await distributedEventManager.start();

    mainLogger.info("Managed.");

    const shutdown = async (incomingError?: Error) => {
        await distributedEventManager.stop();
        await messageQueueAllRawTopicsSubscriber.disconnect();
        await databaseConnection.disconnect();

        if (incomingError) {
            mainLogger.error(incomingError, "Unmanaged.");

            throw incomingError;
        }

        mainLogger.info("Unmanaged.");

        return undefined;
    };

    try {
        await managedMain(
            config,
            mainLogger,
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
