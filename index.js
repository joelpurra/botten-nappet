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
import GracefulShutdownManager from "./src/util/graceful-shutdown-manager";
import DatabaseConnection from "./src/storage/database-connection";
import UserRepository from "./src/storage/repository/user-repository";
import UserStorageManager from "./src/storage/manager/user-storage-manager";

import TwitchPubSubConnection from "./src/twitch/pubsub/pubsub-connection";
import TwitchPubSubLoggingHandler from "./src/twitch/pubsub/handler/logging";
import TwitchIrcConnection from "./src/twitch/irc/irc-connection";
import TwitchIrcLoggingHandler from "./src/twitch/irc/handler/logging";
import TwitchIrcPingHandler from "./src/twitch/irc/handler/ping";
import TwitchIrcGreetingHandler from "./src/twitch/irc/handler/greeting";
import TwitchIrcNewChatterHandler from "./src/twitch/irc/handler/new-chatter";
import TwitchIrcSubscribingHandler from "./src/twitch/irc/handler/subscribing";
import PollingClientIdConnection from "./src/twitch/polling/connection/polling-clientid-connection";
import TwitchPollingFollowingHandler from "./src/twitch/polling/handler/following";
import TwitchPollingApplicationTokenConnection from "./src/twitch/authentication/polling-application-token-connection";
import TwitchApplicationTokenManager from "./src/twitch/authentication/application-token-manager";
import TwitchUserTokenManager from "./src/twitch/authentication/user-token-manager";
import TwitchRequestHelper from "./src/twitch/helper/request-helper";
import TwitchTokenHelper from "./src/twitch/helper/token-helper";
import TwitchUserHelper from "./src/twitch/helper/user-helper";
import TwitchUserTokenHelper from "./src/twitch/helper/user-token-helper";
import TwitchCSRFHelper from "./src/twitch/helper/csrf-helper";

const assert = require("power-assert");
const Promise = require("bluebird");

const fs = require("fs");
const pino = require("pino");

const BOTTEN_NAPPET_DEFAULT_LOGGING_LEVEL = "error";
const BOTTEN_NAPPET_DEFAULT_POLLING_INTERVAL = 30 * 1000;

// TODO: better config handling.
const loggingLevel = process.env.BOTTEN_NAPPET_LOGGING_LEVEL || BOTTEN_NAPPET_DEFAULT_LOGGING_LEVEL;
const loggingFile = process.env.BOTTEN_NAPPET_LOG_FILE;
const databaseUri = process.env.BOTTEN_NAPPET_DATABASE_URI;
const twitchAppClientId = process.env.TWITCH_APP_CLIENT_ID;
const twitchAppClientSecret = process.env.TWITCH_APP_CLIENT_SECRET;
const twitchAppOAuthRedirectUrl = process.env.TWITCH_APP_OAUTH_REDIRECT_URL;
const twitchUserName = process.env.TWITCH_USER_NAME;

// TODO: simplify validation and validation error messages.
assert.strictEqual(typeof loggingLevel, "string", "BOTTEN_NAPPET_LOGGING_LEVEL");
assert(loggingLevel.length > 0, "BOTTEN_NAPPET_LOGGING_LEVEL");
assert.strictEqual(typeof loggingFile, "string", "BOTTEN_NAPPET_LOG_FILE");
assert(loggingFile.length > 0, "BOTTEN_NAPPET_LOG_FILE");
assert.strictEqual(typeof databaseUri, "string", "BOTTEN_NAPPET_DATABASE_URI");
assert(databaseUri.length > 0, "BOTTEN_NAPPET_DATABASE_URI");
assert(databaseUri.startsWith("nedb://"), "BOTTEN_NAPPET_DATABASE_URI");
assert.strictEqual(typeof twitchAppClientId, "string", "TWITCH_APP_CLIENT_ID");
assert(twitchAppClientId.length > 0, "TWITCH_APP_CLIENT_ID");
assert.strictEqual(typeof twitchAppOAuthRedirectUrl, "string", "TWITCH_APP_OAUTH_REDIRECT_URL");
assert(twitchAppOAuthRedirectUrl.length > 0, "TWITCH_APP_OAUTH_REDIRECT_URL");
assert.strictEqual(typeof twitchUserName, "string", "TWITCH_USER_NAME");
assert(twitchUserName.length > 0, "TWITCH_USER_NAME");

const twitchOAuthTokenUri = "https://api.twitch.tv/kraken/oauth2/token";
const twitchOAuthTokenRevocationUri = "https://api.twitch.tv/kraken/oauth2/revoke";
const twitchOAuthAuthorizationUri = "https://api.twitch.tv/kraken/oauth2/authorize";
const twitchOAuthTokenVerificationUri = "https://api.twitch.tv/kraken";
const twitchUsersDataUri = "https://api.twitch.tv/helix/users";
const twitchPubSubWebSocketUri = "wss://pubsub-edge.twitch.tv/";
const twitchIrcWebSocketUri = "wss://irc-ws.chat.twitch.tv:443/";
const followingPollingLimit = 10;
const twitchAppScopes = [
    "channel_feed_read",
];
const twitchAppTokenRefreshInterval = 45 * 60 * 1000;

// NOTE: assuming that the user only joins their own channel, with a "#" prefix.
const twitchChannelName = `#${twitchUserName}`;

const applicationName = "botten-nappet";

const logFileStream = fs.createWriteStream(loggingFile);
const rootPinoLogger = pino(
    {
        name: applicationName,
        level: loggingLevel,
        extreme: true,
        onTerminated: (/* eslint-disable no-unused-vars */eventName, error/* eslint-enable no-unused-vars */) => {
            // NOTE: override onTerminated to prevent pino from calling process.exit().
        },
    },
    logFileStream
);

const rootLogger = new PinoLogger(rootPinoLogger);
const indexLogger = rootLogger.child("index");
const gracefulShutdownManager = new GracefulShutdownManager(rootLogger);
const databaseConnection = new DatabaseConnection(rootLogger, databaseUri);
const twitchPollingApplicationTokenConnection = new TwitchPollingApplicationTokenConnection(rootLogger, twitchAppClientId, twitchAppClientSecret, twitchAppScopes, twitchAppTokenRefreshInterval, false, twitchOAuthTokenUri, "post");
const twitchApplicationTokenManager = new TwitchApplicationTokenManager(rootLogger, twitchPollingApplicationTokenConnection, twitchAppClientId, twitchOAuthTokenRevocationUri);
const twitchCSRFHelper = new TwitchCSRFHelper(rootLogger);
const twitchRequestHelper = new TwitchRequestHelper(rootLogger);
const twitchTokenHelper = new TwitchTokenHelper(rootLogger, twitchRequestHelper, twitchOAuthTokenRevocationUri, twitchOAuthTokenVerificationUri, twitchAppClientId);

const main = async() => {
    await gracefulShutdownManager.start();
    await databaseConnection.connect();

    indexLogger.info("Managed.");

    const shutdown = async(incomingError) => {
        await databaseConnection.disconnect();
        await gracefulShutdownManager.stop();

        if (incomingError) {
            indexLogger.error("Unmanaged.", incomingError);

            throw incomingError;
        }

        indexLogger.info("Unmanaged.");

        return undefined;
    };

    try {
        await twitchPollingApplicationTokenConnection.connect();
        await twitchApplicationTokenManager.start();
        await twitchApplicationTokenManager.getOrWait();

        indexLogger.info("Application authenticated.");

        const disconnectAuthentication = async(incomingError) => {
            await twitchApplicationTokenManager.stop();
            await twitchPollingApplicationTokenConnection.disconnect();

            if (incomingError) {
                indexLogger.error("Unauthenticated.", incomingError);

                throw incomingError;
            }

            indexLogger.info("Unauthenticated.");

            return undefined;
        };

        try {
            const twitchApplicationAccessTokenProvider = async() => twitchApplicationTokenManager.getOrWait();

            const twitchUserHelper = new TwitchUserHelper(
                rootLogger,
                twitchRequestHelper,
                twitchUsersDataUri,
                twitchApplicationAccessTokenProvider
            );

            const userStorageManager = new UserStorageManager(rootLogger, UserRepository);

            const twitchUserTokenHelper = new TwitchUserTokenHelper(
                rootLogger,
                twitchCSRFHelper,
                userStorageManager,
                twitchRequestHelper,
                twitchOAuthAuthorizationUri,
                twitchAppOAuthRedirectUrl,
                twitchOAuthTokenUri,
                twitchAppClientId,
                twitchAppClientSecret
            );

            const userTokenManager = new TwitchUserTokenManager(rootLogger, twitchTokenHelper, twitchUserTokenHelper);

            const twitchUserTokenProvider = async() => userTokenManager.get(twitchUserName);
            const twitchUserAccessTokenProvider = async() => {
                const twitchUserToken = await twitchUserTokenProvider();

                return twitchUserToken.token.access_token;
            };

            const twitchUserToken = await twitchUserTokenProvider();
            const twitchUserId = await twitchTokenHelper.getUserIdByRawAccessToken(twitchUserToken.token);

            // TODO: use twitchUserIdProvider instead of twitchUserId.
            // const twitchUserIdProvider = () => Promise.resolve(twitchUserId);

            const followingPollingUri = `https://api.twitch.tv/kraken/channels/${twitchUserId}/follows?limit=${followingPollingLimit}`;

            const twitchPubSubConnection = new TwitchPubSubConnection(rootLogger, twitchPubSubWebSocketUri);
            const twitchIrcConnection = new TwitchIrcConnection(rootLogger, twitchIrcWebSocketUri, twitchChannelName, twitchUserName, twitchUserAccessTokenProvider);

            // TODO: use twitchUserIdProvider instead of twitchUserId.
            const twitchPubSubLoggingHandler = new TwitchPubSubLoggingHandler(rootLogger, twitchPubSubConnection, twitchUserAccessTokenProvider, twitchUserId);
            const twitchPollingFollowingConnection = new PollingClientIdConnection(rootLogger, twitchAppClientId, BOTTEN_NAPPET_DEFAULT_POLLING_INTERVAL, false, followingPollingUri, "get");

            const connectables = [
                twitchPubSubConnection,
                twitchIrcConnection,
                twitchPollingFollowingConnection,
            ];

            await Promise.map(connectables, async(connectable) => connectable.connect());

            indexLogger.info("Connected.");

            const disconnect = async(incomingError) => {
                await Promise.map(connectables, async(connectable) => connectable.disconnect());

                if (incomingError) {
                    indexLogger.error("Disconnected.", incomingError);

                    throw incomingError;
                }

                indexLogger.info("Disconnected.");

                return undefined;
            };

            try {
                const twitchIrcLoggingHandler = new TwitchIrcLoggingHandler(rootLogger, twitchIrcConnection);
                const twitchIrcPingHandler = new TwitchIrcPingHandler(rootLogger, twitchIrcConnection);
                const twitchIrcGreetingHandler = new TwitchIrcGreetingHandler(rootLogger, twitchIrcConnection, twitchUserName);
                const twitchIrcNewChatterHandler = new TwitchIrcNewChatterHandler(rootLogger, twitchIrcConnection);
                const twitchIrcSubscribingHandler = new TwitchIrcSubscribingHandler(rootLogger, twitchIrcConnection);
                const twitchPollingFollowingHandler = new TwitchPollingFollowingHandler(rootLogger, twitchPollingFollowingConnection, twitchIrcConnection, twitchChannelName);

                const startables = [
                    twitchPubSubLoggingHandler,
                    twitchIrcLoggingHandler,
                    twitchIrcPingHandler,
                    twitchIrcGreetingHandler,
                    twitchIrcNewChatterHandler,
                    twitchIrcSubscribingHandler,
                    twitchPollingFollowingHandler,
                ];

                await Promise.map(startables, async(startable) => startable.start());

                indexLogger.info(`Started listening to events for ${twitchUserName} (${twitchUserId}).`);

                const stop = async(incomingError) => {
                    await Promise.map(startables, async(startable) => startable.stop());

                    if (incomingError) {
                        indexLogger.error("Stopped.", incomingError);

                        throw incomingError;
                    }

                    indexLogger.info("Stopped.");

                    return undefined;
                };

                try {
                    await gracefulShutdownManager.waitForShutdownSignal();

                    await stop();
                }
                catch (error) {
                    stop(error);
                }

                await disconnect();
            }
            catch (error) {
                disconnect(error);
            }

            await disconnectAuthentication();
        } catch (error) {
            disconnectAuthentication(error);
        }

        await shutdown();
    } catch (error) {
        shutdown(error);
    }
};

const run = async() => {
    try {
        await main();

        process.exitCode = 0;
    } catch (error) {
        /* eslint-disable no-console */
        console.error("Error.", error);
        /* eslint-enable no-console */

        process.exitCode = 1;
    }
};

run();
