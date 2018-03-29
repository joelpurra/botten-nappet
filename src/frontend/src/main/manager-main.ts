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

/* tslint:disable max-line-length */
import IIncomingCheeringWithCheermotesEvent from "../../../backend/src/twitch/polling/event/iincoming-cheering-with-cheermotes-event";
/* tslint:enable max-line-length */

import IIncomingFollowingEvent from "../../../backend/src/twitch/polling/event/iincoming-following-event";
import IIncomingSubscriptionEvent from "../../../backend/src/twitch/polling/event/iincoming-subscription-event";
import IIncomingSearchResultEvent from "../../../backend/vidy/command/iincoming-search-result-event";

import managedMain from "./managed-main";
import { isValidColor } from "../../shared/colors";

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

    // TODO: configurable.
    const topicsStringSeparator = ":";
    const splitTopics = (topicsString: string): string[] => topicsString.split(topicsStringSeparator);

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>(
            mainLogger,
            config.zmqAddress,
            // TODO: no backend events.
            ...splitTopics("external:backend:twitch:incoming:irc:command"),
        );
    await twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand.connect();

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingFollowingEvent>(
            mainLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingFollowingEvent),
        );
    await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent.connect();

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringWithCheermotesEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingCheeringWithCheermotesEvent>(
            mainLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingCheeringWithCheermotesEvent),
        );
    await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringWithCheermotesEvent.connect();

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSubscriptionEvent>(
            mainLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingSubscriptionEvent),
        );
    await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent.connect();

    const vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent =
        new MessageQueueSingleItemJsonTopicsSubscriber<IIncomingSearchResultEvent>(
            mainLogger,
            config.zmqAddress,
            ...splitTopics(config.topicVidyIncomingSearchResultEvent),
        );
    await vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent.connect();

    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand.dataObservable.forEach((data) => {
        let msg = null;

        const exampleCheermote1 = "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/1/4.gif";
        const exampleCheermote100 = "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/100/4.gif";

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
                            let color = commandArguments[0];

                            if (!isValidColor(color)) {
                                color = "rgba(255,255,255,0.5)";
                            }

                            msg = {
                                data: {
                                    color,
                                    timestamp: data.timestamp,
                                    username: data.username,
                                },
                                event: messageCommand,
                            };
                            break;

                        case "cowbell":
                        case "say":
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

                        case "cheering-with-cheermotes":
                            msg = {
                                data: {
                                    args: commandArguments,
                                    // TODO: use random library.
                                    bits: Math.floor(Math.random() * 500),
                                    cheermotes: [
                                        {
                                            cheerToken: {
                                                amount: 1,
                                                prefix: "cheer",
                                            },
                                            url: exampleCheermote1,
                                        },
                                        {
                                            cheerToken: {
                                                amount: 100,
                                                prefix: "cheer",
                                            },
                                            url: exampleCheermote100,
                                        },
                                    ],
                                    message: "cheer100 cheer1 cheer1 My custom cheering message 😀 cheer100",
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
                    const isSubscriber = (data.tags && data.tags.subscriber === "1") || false;

                    msg = {
                        data: {
                            isSubscriber,
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

    twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringWithCheermotesEvent
        .dataObservable.forEach((data) => {
            const msg = {
                data: {
                    // args: commandArguments,
                    bits: data.bits,
                    cheermotes: data.cheermotes,
                    message: data.message,
                    timestamp: data.timestamp,
                    total: data.total,
                    username: data.triggerer.name,
                },
                event: "cheering-with-cheermote",
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

    vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent.dataObservable.forEach((data) => {
        const rnd = Math.floor(Math.random() * data.clips.results.length);
        const randomResult = data.clips.results[rnd];
        const randomVideoUrl = randomResult.files.landscapeVideo240.url;

        const msg = {
            data: {
                // TODO: don't assume too much.
                videoUrl: randomVideoUrl,
                // timestamp: data.timestamp,
                // username: data.triggerer.name,
            },
            event: "vidy",
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
        await vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent.disconnect();
        await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent.disconnect();
        await twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringWithCheermotesEvent.disconnect();
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
