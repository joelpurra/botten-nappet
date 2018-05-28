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

import {
    context,
} from "@botten-nappet/backend-shared/lib/dependency-injection/context/context";
import {
    scoped,
} from "@botten-nappet/backend-shared/lib/dependency-injection/scoped/scoped";
import {
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
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

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";
import FrontendConfig from "../config/frontend-config";

/* tslint:disable max-line-length */

import IncomingCheeringWithCheermotesEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-cheering-with-cheermotes-event-single-item-json-topics-subscriber";
import IncomingFollowingEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-following-event-single-item-json-topics-subscriber";
import IncomingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-irc-command-single-item-json-topics-subscriber";
import IncomingSearchResultEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-search-result-event-single-item-json-topics-subscriber";
import IncomingSubscriptionEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-subscription-event-single-item-json-topics-subscriber";

import IIncomingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/iincoming-irc-command";

/* tslint:enable max-line-length */

import {
    isValidColor,
} from "@botten-nappet/client-shared/src/colors";

import FrontendManagedMain from "./managed-main";

interface ICustomWebSocketEventData {
    eventName: string;
    customData: object;
}

@asrt(8)
export default class FrontendManagerMain {
    private io: SocketIo.Server | null;
    private server: http.Server | null;
    private connectables: IConnectable[];
    private logger: PinoLogger;

    constructor(
        @asrt() @context(FrontendManagedMain, "FrontendManagedMain")
        private readonly frontendManagedMain: () => FrontendManagedMain,
        @asrt() private readonly frontendConfig: FrontendConfig,
        @asrt() logger: PinoLogger,
        @asrt() @scoped(IncomingIrcCommandSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
            IncomingIrcCommandSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingFollowingEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent:
            IncomingFollowingEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingCheeringWithCheermotesEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringWithCheermotesEvent:
            IncomingCheeringWithCheermotesEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingSubscriptionEventSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent:
            IncomingSubscriptionEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingSearchResultEventSingleItemJsonTopicsSubscriber)
        private readonly vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent:
            IncomingSearchResultEventSingleItemJsonTopicsSubscriber,
    ) {
        this.logger = logger.child(this.constructor.name);

        this.server = null;
        this.io = null;
        this.connectables = [];
    }

    @asrt(0)
    public async start(): Promise<void> {
        assert.hasLength(this.connectables, 0);

        const app = new Koa();
        app.on("error", (err, ctx) => {
            // TODO: shut down server.
            this.logger.error(err, ctx, "server error");
        });

        const projectRootDirectoryPath = await pkgDir(__dirname);

        // TODO: better null handling.
        assert.nonEmptyString(projectRootDirectoryPath!);

        const staticPublicRootDirectoryPath = path.join(
            projectRootDirectoryPath!,
            this.frontendConfig.staticPublicRootDirectory,
        );
        app.use(koaStatic(staticPublicRootDirectoryPath));

        this.logger.info(staticPublicRootDirectoryPath, "Serving static files from directory path.");

        this.server = http.createServer(app.callback());
        this.io = SocketIo(this.server);

        /* tslint:disable max-line-length */

        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringWithCheermotesEvent);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent);
        this.connectables.push(this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent);

        /* tslint:enable max-line-length */

        // TODO: separate connectables and startables/observers.
        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand.dataObservable
            .forEach((data) => {
                assert.not.null(this.io);

                // TODO: better null handling.
                if (!this.io) {
                    throw new Error("this.io was not set.");
                }

                let customWebSocketEventData: ICustomWebSocketEventData | null = null;

                switch (data.command) {
                    case "PRIVMSG":
                        customWebSocketEventData = this.getIrcPrivMsgWebsocketEventData(data);
                        break;
                }

                if (customWebSocketEventData === null) {
                    return;
                }

                assert.nonEmptyString(customWebSocketEventData.eventName);
                assert.not.null(customWebSocketEventData.customData);
                assert.object(customWebSocketEventData.customData);

                const msg = {
                    data: Object.assign(
                        {},
                        customWebSocketEventData.customData,

                        // NOTE: always keep default data, no overrides.
                        {
                            timestamp: data.timestamp,
                            username: data.username,
                        },
                    ),
                    event: customWebSocketEventData.eventName,
                };

                this.io.send(msg);
            });

        this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingFollowingEvent.dataObservable
            .forEach((data) => {
                assert.not.null(this.io);

                // TODO: better null handling.
                if (!this.io) {
                    throw new Error("this.io was not set.");
                }

                const msg = {
                    data: {
                        timestamp: data.timestamp,
                        username: data.triggerer.name,
                    },
                    event: "following",
                };

                this.io.send(msg);
            });

        this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingCheeringWithCheermotesEvent.dataObservable
            .forEach((data) => {
                assert.not.null(this.io);

                // TODO: better null handling.
                if (!this.io) {
                    throw new Error("this.io was not set.");
                }

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
                    event: "cheering-with-cheermotes",
                };

                this.io.send(msg);
            });

        this.twitchMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSubscriptionEvent.dataObservable
            .forEach((data) => {
                assert.not.null(this.io);

                // TODO: better null handling.
                if (!this.io) {
                    throw new Error("this.io was not set.");
                }

                const msg = {
                    data: {
                        timestamp: data.timestamp,
                        username: data.triggerer.name,
                    },
                    event: "subscription",
                };

                this.io.send(msg);
            });

        this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIIncomingSearchResultEvent.dataObservable
            .forEach((data) => {
                assert.not.null(this.io);

                // TODO: better null handling.
                if (!this.io) {
                    throw new Error("this.io was not set.");
                }

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

                this.io.send(msg);
            });

        this.io.on("connection", (clientSocket) => {
            // this.logger.trace(clientSocket, "incoming connection");
            this.logger.trace(clientSocket.rooms, "incoming connection");

            // clientSocket.on("HAI", (data) => {
            //     this.logger.trace(data, "HAI");
            // });

            clientSocket.on("message", () => {
                this.logger.trace("message");
            });

            clientSocket.on("disconnect", () => {
                this.logger.trace("disconnect");
            });
        });

        this.logger.info("Managed.");

        await Bluebird.promisify<void, number>(this.server.listen, {
            context: this.server,
        })(this.frontendConfig.port);

        await this.frontendManagedMain().start();
    }

    @asrt(0)
    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.frontendManagedMain) {
            await this.frontendManagedMain().stop();
        }

        await Bluebird.map(
            this.connectables,
            async (connectable) => {
                try {
                    await connectable.disconnect();
                } catch (error) {
                    this.logger
                        .error(error, connectable, "Swallowed error while disconnecting.");
                }
            },
        );

        if (this.io) {
            try {
                await Bluebird.promisify(this.io.close, {
                    context: this.io,
                })();
            } catch (error) {
                this.logger
                    .error(error, this.io, "Swallowed error while closing io.");
            }

            this.io = null;
        }

        if (this.server && this.server.listening) {
            try {
                await Bluebird.promisify(this.server.close, {
                    context: this.server,
                })();
            } catch (error) {
                this.logger
                    .error(error, this.server, "Swallowed error while closing server.");
            }
        }

        this.server = null;
    }

    @asrt(1)
    private getIrcPrivMsgWebsocketEventData(
        @asrt() data: IIncomingIrcCommand,
    ): ICustomWebSocketEventData | null {
        if (data.message === null) {
            throw new Error("data.message");
        }

        let handled = false;
        let eventName: string | null = null;
        let customData: object | null = null;

        const isSubscriber = (data.tags && data.tags.subscriber === "1") || false;

        const exampleCheermote1 = "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/1/4.gif";
        const exampleCheermote100 = "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/100/4.gif";

        const commandPrefix = "!";
        const messageParts = data.message.trim().split(/\s+/);
        const isCommandMessage = messageParts[0].startsWith(commandPrefix);

        if (isCommandMessage) {
            const messageCommand = messageParts[0].slice(commandPrefix.length);
            const commandArguments = messageParts.slice(1);

            eventName = messageCommand;

            // TODO: remove commands after testing.
            switch (messageCommand) {
                case "animate":
                    let color = commandArguments[0];
                    if (!isValidColor(color)) {
                        color = "rgba(255,255,255,0.5)";
                    }
                    customData = {
                        color,
                    };
                    handled = true;
                    break;

                case "cowbell":
                case "following":
                    customData = {};
                    handled = true;
                    break;

                case "say":
                    customData = {
                        message: commandArguments.join(" "),
                    };
                    handled = true;
                    break;

                case "subscription":
                    customData = {
                        // TODO: use random library.
                        months: Math.floor(Math.random() * 3),
                    };
                    handled = true;
                    break;

                case "cheering-with-cheermotes":
                    customData = {
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
                        // TODO: use random library.
                        total: Math.floor(Math.random() * 50000),
                    };
                    handled = true;
                    break;

                default:
                    handled = false;
            }
        } else {
            eventName = "chat-message";

            customData = {
                isSubscriber,
                message: data.message,
            };

            handled = true;
        }

        if (handled === false) {
            return null;
        }

        const result = {
            customData: customData!,
            eventName: eventName!,
        };

        return result;
    }
}
