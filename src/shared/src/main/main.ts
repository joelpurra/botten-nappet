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

import Config from "../config/config";
import GracefulShutdownManager from "../util/graceful-shutdown-manager";

import MessageQueuePublisher from "../message-queue/publisher";

import createRootLogger from "../util/create-root-logger";

import backendMain from "../../../backend/src/main/main";
import frontendMain from "../../../frontend/src/main/main";

export default async function main(): Promise<void> {
    const config = new Config(configLibrary);

    config.validate();

    const rootLogger = await createRootLogger(config);

    const sharedLogger = rootLogger.child("shared");

    const gracefulShutdownManager = new GracefulShutdownManager(rootLogger);

    const messageQueuePublisher = new MessageQueuePublisher(rootLogger, config.zmqAddress);

    await gracefulShutdownManager.start();
    await messageQueuePublisher.connect();

    await Promise.all([
        backendMain(sharedLogger, gracefulShutdownManager, messageQueuePublisher),
        frontendMain(sharedLogger, gracefulShutdownManager, messageQueuePublisher),
    ]);

    await messageQueuePublisher.disconnect();
    await gracefulShutdownManager.stop();
}
