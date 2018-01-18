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

import ShutdownManager from "./src/util/shutdown-manager";
import TwitchPubSubConnection from "./src/twitch/pubsub-connection";
import TwitchPubSubManager from "./src/twitch/pubsub-manager";

const assert = require("assert");
const Promise = require("bluebird");

// TODO: better token/config handling.
const twitchWebSocketUri = "wss://pubsub-edge.twitch.tv/";
const twitchAppAccessToken = process.env.TWITCH_APP_ACCESS_TOKEN;
const twitchUserAccessToken = process.env.TWITCH_USER_ACCESS_TOKEN;
const twitchUserName = process.env.TWITCH_USER_NAME;

// NOTE: use a twitch api lookup to get the id from twitchUserName.
const twitchUserId = parseInt(process.env.TWITCH_USER_ID, 10);

assert.strictEqual(typeof twitchAppAccessToken, "string");
assert(twitchAppAccessToken.length > 0);
assert.strictEqual(typeof twitchUserAccessToken, "string");
assert(twitchUserAccessToken.length > 0);
assert.strictEqual(typeof twitchUserName, "string");
assert(twitchUserName.length > 0);
assert(!isNaN(twitchUserId));
assert(twitchUserId > 0);

const shutdownManager = new ShutdownManager();
const twitchPubSubConnection = new TwitchPubSubConnection(twitchWebSocketUri);
const twitchPubSubManager = new TwitchPubSubManager(twitchPubSubConnection, twitchUserId, twitchUserAccessToken);

Promise.resolve()
    .then(() => shutdownManager.start())
    .then(() => twitchPubSubConnection.connect())
    .then(() => {
        /* eslint-disable no-console */
        console.log("Connected.");
        /* eslint-enable no-console */

        const disconnect = (incomingError) => twitchPubSubConnection.disconnect()
            .then(() => {
                if (incomingError) {
                    /* eslint-disable no-console */
                    console.error("Disconnected.", incomingError);
                    /* eslint-enable no-console */
                } else {
                    /* eslint-disable no-console */
                    console.log("Disconnected.");
                    /* eslint-enable no-console */
                }

                return undefined;
            });

        return Promise.resolve()
            .then(() => twitchPubSubManager.start())
            .then(() => {
                /* eslint-disable no-console */
                console.log(`Started listening to events for ${twitchUserName} (${twitchUserId}).`);
                /* eslint-enable no-console */

                const stop = (incomingError) => twitchPubSubManager.stop()
                    .then(() => {
                        if (incomingError) {
                            /* eslint-disable no-console */
                            console.error("Stopped.", incomingError);
                            /* eslint-enable no-console */
                        } else {
                            /* eslint-disable no-console */
                            console.log("Stopped.");
                            /* eslint-enable no-console */
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
        console.log("Error.", error);
        /* eslint-enable no-console */

        process.exitCode = 1;
    });
