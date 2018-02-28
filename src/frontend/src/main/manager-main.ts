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

import ITwitchIncomingIrcCommand from "../../../backend/src/twitch/irc/command/iincoming-irc-command";
/* tslint:disable max-line-length */
import MessageQueueSingleItemJsonTopicsSubscriber from "../../../shared/src/message-queue/single-item-topics-subscriber";
/* tslint:enable max-line-length */

import IIncomingCheeringEvent from "../../../backend/src/twitch/polling/event/iincoming-cheering-event";
import IIncomingFollowingEvent from "../../../backend/src/twitch/polling/event/iincoming-following-event";
import IIncomingSubscriptionEvent from "../../../backend/src/twitch/polling/event/iincoming-subscription-event";
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

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>(
            mainLogger,
            config.zmqAddress,
            // TODO: no backend events.
            "backend-twitch-incoming-irc-command",
        );
    await twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand.connect();

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingFollowingEvent>(
            mainLogger,
            config.zmqAddress,
            config.topicTwitchIncomingFollowingEvent,
        );
    await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent.connect();

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheeringEvent>(
            mainLogger,
            config.zmqAddress,
            config.topicTwitchIncomingCheeringEvent,
        );
    await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent.connect();

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSubscriptionEvent>(
            mainLogger,
            config.zmqAddress,
            config.topicTwitchIncomingSubscriptionEvent,
        );
    await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent.connect();

    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand.dataObservable.forEach((data) => {
        let msg = null;

        switch (data.command) {
            case "PRIVMSG":
                if (data.message === null) {
                    return;
                }

                const commandPrefix = "!";
                const messageParts = data.message.trim().split(/\s+/);

                if (messageParts[0].startsWith(commandPrefix)) {
                    const messageCommand = messageParts[0].slice(commandPrefix.length);
                    const commandArguments = messageParts.slice(1);

                    switch (messageCommand) {
                        // TODO: check arguments.
                        case "animate":
                        case "cowbell":
                        // TODO: remove after testing.
                        case "following":
                            msg = {
                                data: {
                                    args: commandArguments,
                                    timestamp: data.timestamp,
                                    username: data.username,
                                },
                                event: messageCommand,
                            };
                            break;

                        case "subscription":
                            msg = {
                                data: {
                                    args: commandArguments,
                                    // TODO: use random library.
                                    months: Math.floor(Math.random() * 3),
                                    timestamp: data.timestamp,
                                    username: data.username,
                                },
                                event: messageCommand,
                            };
                            break;

                        case "cheering":
                            msg = {
                                data: {
                                    args: commandArguments,
                                    // TODO: use random library.
                                    bits: Math.floor(Math.random() * 500),
                                    message: "My custom cheering message 😀",
                                    timestamp: data.timestamp,
                                    // TODO: use random library.
                                    total: Math.floor(Math.random() * 50000),
                                    username: data.username,
                                },
                                event: messageCommand,
                            };
                            break;
                    }
                } else {
                    // TODO: remove?
                    msg = {
                        data: {
                            message: data.message,
                            timestamp: data.timestamp,
                            username: data.username,
                        },
                        event: "chat-message",
                    };
                }
                break;
        }

        if (msg === null) {
            return;
        }

        io.send(msg);
    });

    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent.dataObservable.forEach((data) => {
        const msg = {
            data: {
                timestamp: data.timestamp,
                username: data.triggerer.name,
            },
            event: "following",
        };

        io.send(msg);
    });

    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent.dataObservable.forEach((data) => {
        const msg = {
            data: {
                // args: commandArguments,
                bits: data.bits,
                message: data.message,
                timestamp: data.timestamp,
                total: data.total,
                username: data.triggerer.name,
            },
            event: "cheering",
        };

        io.send(msg);
    });

    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent.dataObservable.forEach((data) => {
        const msg = {
            data: {
                timestamp: data.timestamp,
                username: data.triggerer.name,
            },
            event: "subscription",
        };

        io.send(msg);
    });

    io.on("connection", (clientSocket) => {
        // mainLogger.trace(clientSocket, "incoming connection");
        mainLogger.trace(clientSocket.rooms, "incoming connection");

        // clientSocket.on("HAI", (data) => {
        //     mainLogger.trace(data, "HAI");
        // });

        clientSocket.on("message", () => {
            mainLogger.trace("message");
        });

        clientSocket.on("disconnect", () => {
            mainLogger.trace("disconnect");
        });
    });

    mainLogger.info("Managed.");

    const shutdown = async (incomingError?: Error) => {
        await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent.disconnect();
        await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringEvent.disconnect();
        await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent.disconnect();
        await twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand.disconnect();
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
