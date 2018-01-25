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

// NOTE: parts of file come from official Twitch example code.
// https://github.com/twitchdev/chat-samples/blob/master/javascript/chatbot.js

/*
Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

    This file is what connects to chat and parses messages as they come along. The chat client connects via a
    Web Socket to Twitch chat. The important part events are onopen and onmessage.
*/

const assert = require("power-assert");
const Promise = require("bluebird");

const WebSocket = require("ws");

export default class IrcConnection {
    constructor(logger, uri, channel, username, userAccessTokenProvider) {
        assert.strictEqual(arguments.length, 5);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof uri, "string");
        assert(uri.length > 0);
        assert(uri.startsWith("wss://"));
        assert.strictEqual(typeof channel, "string");
        assert(channel.length > 0);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);
        assert.strictEqual(typeof userAccessTokenProvider, "function");

        this._logger = logger.child("IrcConnection");
        this._uri = uri;
        this._channel = channel;
        this._username = username;
        this._userAccessTokenProvider = userAccessTokenProvider;

        this._ws = null;
        this._maxDisconnectWaitMilliseconds = 10 * 1000;
        this._dataHandlers = [];
    }

    connect() {
        assert.strictEqual(arguments.length, 0);
        assert.strictEqual(this._ws, null);

        return new Promise((resolve, reject) => {
            const onOpen = () => {
                Promise.resolve()
                    .then(() => this._userAccessTokenProvider())
                    .then((userAccessToken) => {
                        unregisterListeners();

                        // TODO: make capabilities configurable/subclassable?
                        const capabilities = [
                            "twitch.tv/tags",
                            "twitch.tv/commands",
                            "twitch.tv/membership",
                        ];

                        const capabilitiesString = capabilities.join(" ");

                        return Promise.mapSeries(
                            [
                                {
                                    cmds: [
                                        `CAP REQ :${capabilitiesString}`,
                                    ],
                                    verifier: (message) => message.includes("CAP * ACK"),
                                },

                                {
                                    cmds: [
                                        // NOTE: the user access token needs to have an "oauth:" prefix.
                                        `PASS oauth:${userAccessToken}`,
                                        `NICK ${this._username}`,
                                    ],
                                    // NOTE: the "001" message might change, but for now it's a hardcoded return value.
                                    // https://dev.twitch.tv/docs/irc#connecting-to-twitch-irc
                                    verifier: (message) => message.includes("001"),
                                },

                                {
                                    cmds: [
                                        `JOIN ${this._channel}`,
                                    ],
                                    verifier: (message) => message.includes(`JOIN ${this._channel}`),
                                },
                            ],
                            ({ cmds, verifier }) => this._sendCommandsAndVerifyResponse(cmds, verifier)
                        )
                            .then(() => {
                                resolve();

                                return undefined;
                            });
                    })
                    .catch((error) => {
                        reject(error);

                        return undefined;
                    });
            };

            const onError = (error) => {
                unregisterListeners();

                this.disconnect();

                reject(error);
            };

            const registerListeners = () => {
                this._ws.once("open", onOpen);
                this._ws.once("error", onError);
            };

            const unregisterListeners = () => {
                this._ws.removeListener("open", onOpen);
                this._ws.removeListener("error", onError);
            };

            this._ws = new WebSocket(this._uri, "irc");

            registerListeners();
        })
            .then(() => {
                this._ws.on("error", this._onError.bind(this));
                this._ws.on("unexpected-response", this._onUnexpectedResponse.bind(this));
                this._ws.on("close", this._onClose.bind(this));
                this._ws.on("message", this._onMessage.bind(this));

                return undefined;
            });
    }

    _sendCommandsAndVerifyResponse(cmds, verifier) {
        assert.strictEqual(arguments.length, 2);
        assert(Array.isArray(cmds));
        assert(cmds.length > 0);
        assert.strictEqual(typeof verifier, "function");

        return new Promise((resolve, reject) => {
            const errorHandler = (error) => {
                unregisterListeners();

                reject(error);
            };

            const messageHandler = (message) => {
                const matchingMessage = verifier(message);

                if (matchingMessage) {
                    unregisterListeners();

                    resolve();
                }
            };

            const registerListeners = () => {
                this._ws.on("error", errorHandler);
                this._ws.on("message", messageHandler);
            };

            const unregisterListeners = () => {
                this._ws.removeListener("error", errorHandler);
                this._ws.removeListener("message", messageHandler);
            };

            registerListeners();

            Promise.mapSeries(
                cmds,
                (cmd) => this._send(cmd)
            )
                .catch((error) => {
                    reject(error);
                });
        });
    }

    _send(data) {
        assert.strictEqual(arguments.length, 1);
        assert(data !== undefined && data !== null);

        return Promise.try(() => {
            let message = null;

            if (typeof data === "string") {
                message = data;
            } else {
                message = JSON.stringify(data);
            }

            this._logger.debug(data, message.length, "_send");

            this._ws.send(message);
        });
    }

    _onError(error) {
        this._logger.error(error, "_onError");
    }

    _onUnexpectedResponse(error) {
        this._logger.error(error, "_onUnexpectedResponse");
    }

    _onClose() {
        this.disconnect();
    }

    disconnect() {
        assert.strictEqual(arguments.length, 0);
        assert.notStrictEqual(this._ws, null);

        return Promise.try(() => {
            if (this._ws.readyState !== WebSocket.OPEN) {
                this._logger.trace("Already disconnected.");

                return;
            }

            return new Promise((resolve, reject) => {
                const hasClosed = () => {
                    resolve();
                };

                this._ws.once("close", hasClosed);

                /* eslint-disable promise/catch-or-return */
                Promise.delay(this._maxDisconnectWaitMilliseconds)
                    .then(() => reject(new Error("Disconnect timed out.")));
                /* eslint-enable promise/catch-or-return */

                this._ws.close();
            })
                .catch(() => {
                    this._logger.warn(`Could not disconnect within ${this._maxDisconnectWaitMilliseconds} milliseconds.`);

                    // NOTE: fallback for a timed out disconnect.
                    this._ws.terminate();

                    return undefined;
                })
                .then(() => {
                    this._ws = null;

                    return undefined;
                });
        });
    }

    reconnect() {
        assert.strictEqual(arguments.length, 0);

        return this._connection.disconnect()
            .then(() => this._connection.connect());
    }

    _parseMessage(rawMessage) {
        /* This is an example of an IRC message with tags. I split it across
          multiple lines for readability. The spaces at the beginning of each line are
          intentional to show where each set of information is parsed. */

        //@badges=global_mod/1,turbo/1;color=#0D4200;display-name=TWITCH_UserNaME;emotes=25:0-4,12-16/1902:6-10;mod=0;room-id=1337;subscriber=0;turbo=1;user-id=1337;user-type=global_mod
        // :twitch_username!twitch_username@twitch_username.tmi.twitch.tv
        // PRIVMSG
        // #channel
        // :Kappa Keepo Kappa

        const parsedMessage = {
            channel: null,
            command: null,
            message: null,
            original: rawMessage,
            originalTags: null,
            tags: null,
            username: null,
        };

        if (rawMessage[0] === "@") {
            const tagIndex = rawMessage.indexOf(" ");
            const userIndex = rawMessage.indexOf(" ", tagIndex + 1);
            const commandIndex = rawMessage.indexOf(" ", userIndex + 1);
            const channelIndex = rawMessage.indexOf(" ", commandIndex + 1);
            const messageIndex = rawMessage.indexOf(":", channelIndex + 1);

            parsedMessage.originalTags = rawMessage.slice(1, tagIndex);
            parsedMessage.username = rawMessage.slice(tagIndex + 2, rawMessage.indexOf("!"));
            parsedMessage.command = rawMessage.slice(userIndex + 1, commandIndex);
            parsedMessage.channel = rawMessage.slice(commandIndex + 1, channelIndex);
            parsedMessage.message = rawMessage.slice(messageIndex + 1);

            parsedMessage.tags = parsedMessage.originalTags
                .split(";")
                .reduce(
                    (obj, tag) => {
                        const parts = tag.split("=");
                        const key = parts[0];
                        const value = parts[1];

                        // NOTE: handle the case of having repeated tag keys.
                        // NOTE: this means a parsed tag value can be either a string or an array of strings.
                        obj[key] = obj[key] ? [].concat(obj[key])
                            .concat(value) : value;

                        return obj;
                    },
                    {}
                );
        } else if (rawMessage.startsWith("PING")) {
            parsedMessage.command = "PING";
            parsedMessage.message = rawMessage.split(":")[1];
        }

        return parsedMessage;
    }

    _onMessage(message) {
        assert.strictEqual(arguments.length, 1);

        // TODO: try-catch for bad messages.
        const data = this._parseMessage(message);

        // TODO: try-catch for bad handlers.
        this._dataHandler(data);
    };

    _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);

        return Promise.filter(
            this._dataHandlers,
            (dataHandler) => Promise.resolve(dataHandler.filter(data))
                .then((shouldHandle) => {
                    if (shouldHandle !== true) {
                        return false;
                    }

                    return Promise.resolve(dataHandler.handler(data));
                })
                .then(() => undefined, (error) => {
                    this._logger.warn(error, `Masking error in dataHandler ${dataHandler.handler.name}`);

                    return undefined;
                })
        );
    }

    listen(handler, filter) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof handler, "function");
        assert.strictEqual(typeof filter, "function");
        assert.notStrictEqual(this._ws, null);

        return Promise.try(() => {
            const dataHandler = {
                handler: handler,
                filter: filter,
            };

            this._dataHandlers.push(dataHandler);

            const killSwitch = () => {
                this._dataHandlers = this._dataHandlers.filter((_dataHandler) => _dataHandler !== dataHandler);
            };

            return killSwitch;
        });
    }
}
