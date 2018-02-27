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

import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import path from "path";
import pkgDir from "pkg-dir";

import http from "http";
import Koa from "koa";
import koaStatic from "koa-static";
import SocketIo from "socket.io";

import GracefulShutdownManager from "../../../shared/src/util/graceful-shutdown-manager";
import PinoLogger from "../../../shared/src/util/pino-logger";
import Config from "../config/config";

import MessageQueuePublisher from "../../../shared/src/message-queue/publisher";

import managedMain from "./managed-main";

export default async function managerMain(
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
): Promise<void> {
    const app = new Koa();
    app.on("error", (err, ctx) => {
        // TODO: shut down server.
        mainLogger.error(err, ctx, "server error");
    });

    const projectRootDirectoryPath = await pkgDir(__dirname);

    // TODO: better null handling.
    assert.nonEmptyString(projectRootDirectoryPath!);

    const staticPublicRootDirectoryPath = path.join(projectRootDirectoryPath!, config.staticPublicRootDirectory);
    app.use(koaStatic(staticPublicRootDirectoryPath));

    const server = http.createServer(app.callback());
    const io = SocketIo(server);

    io.on("connection", (clientSocket) => {
        mainLogger.trace(clientSocket, "incoming connection");

        clientSocket.on("event", (data) => {
            // EXAMPLE: emit an event to all connected sockets.
        });

        clientSocket.on("disconnect", () => {
            // EXAMPLE: emit an event to all connected sockets.
        });

        clientSocket.on("reply", () => {
            // EXAMPLE: listen to the event.
        });

        clientSocket.emit("request",
            // EXAMPLE: emit an event to the socket.
        );

        io.emit("broadcast",
            // EXAMPLE: emit an event to all connected sockets.
        );
    });

    mainLogger.info("Managed.");

    const shutdown = async (incomingError?: Error) => {
        await Bluebird.promisify(server.close, {
            context: server,
        })();

        if (incomingError) {
            mainLogger.error(incomingError, "Unmanaged.");

            throw incomingError;
        }

        mainLogger.info("Unmanaged.");

        return undefined;
    };

    try {
        server.listen(config.port);

        await managedMain(
            config,
            mainLogger,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
        );

        await shutdown();
    } catch (error) {
        shutdown(error);
    }
}
