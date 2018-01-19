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

const assert = require("assert");
const Promise = require("bluebird");

const WebSocket = require("ws");

export default class PubSubConnection {
    constructor(logger, uri) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof uri, "string");
        assert(uri.length > 0);
        assert(uri.startsWith("wss://"));

        this._logger = logger;
        this._uri = uri;

        this._ws = null;
        this._maxDisconnectWaitMilliseconds = 10 * 1000;
    }

    connect() {
        assert.strictEqual(arguments.length, 0);
        assert.strictEqual(this._ws, null);

        return new Promise((resolve, reject) => {
            const onOpen = () => {
                const data = {
                    type: "PING",
                };
                const message = JSON.stringify(data);

                this._send(message);
            };

            const onError = (e) => {
                unregisterListeners();

                this.disconnect();

                reject(e);
            };

            const onMessage = (message) => {
                // TODO: try-catch for bad messages.
                const data = JSON.parse(message);

                if (data.type === "PONG") {
                    unregisterListeners();

                    resolve();
                }
            };

            const registerListeners = () => {
                this._ws.once("open", onOpen);
                this._ws.once("error", onError);
                this._ws.on("message", onMessage);
            };

            const unregisterListeners = () => {
                this._ws.removeListener("open", onOpen);
                this._ws.removeListener("error", onError);
                this._ws.removeListener("message", onMessage);
            };

            this._ws = new WebSocket(this._uri);

            registerListeners();
        })
            .then(() => {
                this._ws.on("error", this._onError.bind(this));
                this._ws.on("unexpected-response", this._onUnexpectedResponse.bind(this));
                this._ws.on("close", this._onClose.bind(this));

                return undefined;
            });
    }

    _send(message) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof message, "string");
        assert(message.length > 0);

        return Promise.try(() => {
            this._logger.debug("_send", message.length, message);

            this._ws.send(message);
        });
    }

    _onError(error) {
        this._logger.error("_onError", error);
    }

    _onUnexpectedResponse(error) {
        this._logger.error("_onUnexpectedResponse", error);
    }

    _onClose() {
        this.disconnect();
    }

    disconnect() {
        assert.strictEqual(arguments.length, 0);
        assert.notStrictEqual(this._ws, null);

        return Promise.try(() => {
            if (this._ws.readyState !== WebSocket.OPEN) {
                // this._logger.warn("Already disconnected.");
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

    listen(userAccessToken, topics, dataHandler) {
        assert.strictEqual(arguments.length, 3);
        assert.strictEqual(typeof userAccessToken, "string");
        assert(userAccessToken.length > 0);
        assert(Array.isArray(topics));
        assert(topics.length > 0);
        assert.strictEqual(typeof dataHandler, "function");

        assert.notStrictEqual(this._ws, null);

        return new Promise((resolve, reject) => {
            const onMessage = (message) => {
                // TODO: try-catch for bad messages.
                const data = JSON.parse(message);

                if (data.type !== "MESSAGE") {
                    return;
                }

                if (!topics.includes(data.data.topic)) {
                    return;
                };

                const messageData = JSON.parse(data.data.message);

                // TODO: try-catch for bad handlers.
                dataHandler(data.data.topic, messageData);
            };

            const onListen = (message) => {
                // TODO: try-catch for bad messages.
                const data = JSON.parse(message);

                if (data.nonce !== nonce) {
                    // NOTE: skip non-matching messages; they are presumably for other handlers.
                    return;
                }

                if (typeof data.error === "string" && data.error.length !== 0) {
                    reject(new Error(`Listen error: ${JSON.stringify(data.error)}`));
                }

                if (data.type !== "RESPONSE") {
                    reject(new Error(`Bad type: ${JSON.stringify(data.type)}`));
                }

                this._ws.removeListener("message", onListen);
                this._ws.on("message", onMessage);

                const killSwitch = () => {
                    if (!this._ws) {
                        throw new Error("Websocket does not exist anymore, killSwitch executed too late.");
                    }

                    this._ws.removeListener("message", onMessage);
                };

                resolve(killSwitch);
            };

            const nonce = Math.random()
                .toString(10);

            const data = {
                type: "LISTEN",
                nonce: nonce,
                data: {
                    topics: topics,
                    auth_token: userAccessToken,
                },
            };
            const message = JSON.stringify(data);

            this._ws.on("message", onListen);

            this._send(message);
        });
    }
}
