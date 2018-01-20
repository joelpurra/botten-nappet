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

import PinoLogger from "./src/util/pino-logger";
import ShutdownManager from "./src/util/shutdown-manager";
import TwitchPubSubConnection from "./src/twitch/pubsub/pubsub-connection";
import TwitchPubSubManager from "./src/twitch/pubsub/pubsub-manager";
import TwitchIrcConnection from "./src/twitch/irc/irc-connection";
import TwitchIrcLoggingHandler from "./src/twitch/irc/handler/logging";
import TwitchIrcPingHandler from "./src/twitch/irc/handler/ping";
import TwitchIrcGreetingHandler from "./src/twitch/irc/handler/greeting";
import TwitchIrcNewChatterHandler from "./src/twitch/irc/handler/new-chatter";
import TwitchIrcSubscribingHandler from "./src/twitch/irc/handler/subscribing";

const assert = require("assert");
const Promise = require("bluebird");

const pino = require("pino");

const BOTTEN_NAPPET_DEFAULT_LOGGING_LEVEL = "error";

// TODO: better token/config handling.
const loggingLevel = process.env.BOTTEN_NAPPET_LOGGING_LEVEL || BOTTEN_NAPPET_DEFAULT_LOGGING_LEVEL;
const twitchAppAccessToken = process.env.TWITCH_APP_ACCESS_TOKEN;
const twitchUserAccessToken = process.env.TWITCH_USER_ACCESS_TOKEN;
const twitchUserName = process.env.TWITCH_USER_NAME;

// NOTE: use a twitch api lookup to get the id from twitchUserName.
const twitchUserId = parseInt(process.env.TWITCH_USER_ID, 10);

// TODO: simplify validation and validation error messages.
assert.strictEqual(typeof loggingLevel, "string", "BOTTEN_NAPPET_LOGGING_LEVEL");
assert(loggingLevel.length > 0, "BOTTEN_NAPPET_LOGGING_LEVEL");
assert.strictEqual(typeof twitchAppAccessToken, "string", "TWITCH_APP_ACCESS_TOKEN");
assert(twitchAppAccessToken.length > 0, "TWITCH_APP_ACCESS_TOKEN");
assert.strictEqual(typeof twitchUserAccessToken, "string", "TWITCH_USER_ACCESS_TOKEN");
assert(twitchUserAccessToken.length > 0, "TWITCH_USER_ACCESS_TOKEN");
assert.strictEqual(typeof twitchUserName, "string", "TWITCH_USER_NAME");
assert(twitchUserName.length > 0, "TWITCH_USER_NAME");
assert(!isNaN(twitchUserId), "TWITCH_USER_ID");
assert(twitchUserId > 0, "TWITCH_USER_ID");

const twitchPubSubWebSocketUri = "wss://pubsub-edge.twitch.tv/";
const twitchIrcWebSocketUri = "wss://irc-ws.chat.twitch.tv:443/";

// NOTE: assuming that the user only joins their own channel, with a "#" prefix.
const twitchChannelName = `#${twitchUserName}`;

const applicationName = "botten-nappet";

const rootPinoLogger = pino({
    name: applicationName,
    level: loggingLevel,
});

const rootLogger = new PinoLogger(rootPinoLogger);
const indexLogger = rootLogger.child("index");
const shutdownManager = new ShutdownManager(rootLogger);
const twitchPubSubConnection = new TwitchPubSubConnection(rootLogger, twitchPubSubWebSocketUri);
const twitchPubSubManager = new TwitchPubSubManager(rootLogger, twitchPubSubConnection, twitchUserId, twitchUserAccessToken);
const twitchIrcConnection = new TwitchIrcConnection(rootLogger, twitchIrcWebSocketUri, twitchChannelName, twitchUserName, twitchUserAccessToken);
const twitchIrcLoggingHandler = new TwitchIrcLoggingHandler(rootLogger, twitchIrcConnection);
const twitchIrcPingHandler = new TwitchIrcPingHandler(rootLogger, twitchIrcConnection);
const twitchIrcGreetingHandler = new TwitchIrcGreetingHandler(rootLogger, twitchIrcConnection, twitchUserName);
const twitchIrcNewChatterHandler = new TwitchIrcNewChatterHandler(rootLogger, twitchIrcConnection);
const twitchIrcSubscribingHandler = new TwitchIrcSubscribingHandler(rootLogger, twitchIrcConnection);

const startables = [
    twitchPubSubManager,
    twitchIrcLoggingHandler,
    twitchIrcPingHandler,
    twitchIrcGreetingHandler,
    twitchIrcNewChatterHandler,
    twitchIrcSubscribingHandler,
];

Promise.resolve()
    .then(() => shutdownManager.start())
    .then(() => Promise.all([
        twitchPubSubConnection.connect(),
        twitchIrcConnection.connect(),
    ]))
    .then(() => {
        indexLogger.info("Connected.");

        const disconnect = (incomingError) => Promise.all([
            twitchPubSubConnection.disconnect(),
            twitchIrcConnection.disconnect(),
        ])
            .then(() => {
                if (incomingError) {
                    indexLogger.error("Disconnected.", incomingError);
                } else {
                    indexLogger.info("Disconnected.");
                }

                return undefined;
            });

        return Promise.resolve()
            .then(() => Promise.map(startables, (startable) => startable.start()))
            .then(() => {
                indexLogger.info(`Started listening to events for ${twitchUserName} (${twitchUserId}).`);

                const stop = (incomingError) => Promise.map(startables, (startable) => startable.stop())
                    .then(() => {
                        if (incomingError) {
                            indexLogger.error("Stopped.", incomingError);
                        } else {
                            indexLogger.info("Stopped.");
                        }

                        return undefined;
                    });

                return shutdownManager.waitForShutdownSignal()
                    .then(() => stop(), (error) => stop(error));
            })
            .then(() => disconnect(), (error) => disconnect(error));
    })
    .then(() => shutdownManager.stop())
    .then(() => {
        process.exitCode = 0;

        return undefined;
    })
    .catch((error) => {
        /* eslint-disable no-console */
        console.error("Error.", error);
        /* eslint-enable no-console */

        process.exitCode = 1;
    });
