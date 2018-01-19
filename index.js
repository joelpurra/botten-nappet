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
import TwitchPubSubConnection from "./src/twitch/pubsub/pubsub-connection";
import TwitchPubSubManager from "./src/twitch/pubsub/pubsub-manager";
import TwitchIrcConnection from "./src/twitch/irc/irc-connection";
import TwitchIrcManager from "./src/twitch/irc/irc-manager";
import TwitchIrcPingManager from "./src/twitch/irc/commands/ping";

const assert = require("assert");
const Promise = require("bluebird");

// TODO: better token/config handling.
const twitchAppAccessToken = process.env.TWITCH_APP_ACCESS_TOKEN;
const twitchUserAccessToken = process.env.TWITCH_USER_ACCESS_TOKEN;
const twitchUserName = process.env.TWITCH_USER_NAME;

// NOTE: use a twitch api lookup to get the id from twitchUserName.
const twitchUserId = parseInt(process.env.TWITCH_USER_ID, 10);

// TODO: simplify validation and validation error messages.
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

const shutdownManager = new ShutdownManager();
const twitchPubSubConnection = new TwitchPubSubConnection(twitchPubSubWebSocketUri);
const twitchPubSubManager = new TwitchPubSubManager(twitchPubSubConnection, twitchUserId, twitchUserAccessToken);
const twitchIrcConnection = new TwitchIrcConnection(twitchIrcWebSocketUri, twitchChannelName, twitchUserName, twitchUserAccessToken);
const twitchIrcManager = new TwitchIrcManager(twitchIrcConnection);
const twitchIrcPingManager = new TwitchIrcPingManager(twitchIrcConnection);

Promise.resolve()
    .then(() => shutdownManager.start())
    .then(() => Promise.all([
        twitchPubSubConnection.connect(),
        twitchIrcConnection.connect(),
    ]))
    .then(() => {
        /* eslint-disable no-console */
        console.log("Connected.");
        /* eslint-enable no-console */

        const disconnect = (incomingError) => Promise.all([
            twitchPubSubConnection.disconnect(),
            twitchIrcConnection.disconnect(),
        ])
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
            .then(() => Promise.all([
                twitchPubSubManager.start(),
                twitchIrcManager.start(),
                twitchIrcPingManager.start(),
            ]))
            .then(() => {
                /* eslint-disable no-console */
                console.log(`Started listening to events for ${twitchUserName} (${twitchUserId}).`);
                /* eslint-enable no-console */

                const stop = (incomingError) => Promise.all([
                    twitchPubSubManager.stop(),
                    twitchIrcManager.stop(),
                    twitchIrcPingManager.stop(),
                ])
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
