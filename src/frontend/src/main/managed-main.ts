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

export default async function managedMain(
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
): Promise<void> {
    mainLogger.info("Managed.");

    const shutdown = async (incomingError?: Error) => {
        if (incomingError) {
            mainLogger.error(incomingError, "Unmanaged.");

            throw incomingError;
        }

        mainLogger.info("Unmanaged.");

        return undefined;
    };

    try {
        await gracefulShutdownManager.waitForShutdownSignal();

        // await applicationXYZ(
        //     config,
        //     mainLogger,
        //     rootLogger,
        //     gracefulShutdownManager,
        //     messageQueuePublisher,
        // );

        await shutdown();
    } catch (error) {
        shutdown(error);
    }
}
