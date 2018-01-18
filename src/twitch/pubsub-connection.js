const assert = require("assert");
const Promise = require("bluebird");

const WebSocket = require("ws");

export default class PubSubConnection {
    constructor(uri) {
        assert.strictEqual(typeof uri, "string");
        assert(uri.length > 0);
        assert(uri.startsWith("wss://"));

        this._uri = uri;

        this._ws = null;
        this._connected = false;

        this.maxDisconnectWaitMilliseconds = 10 * 1000;
    }

    connect() {
        assert(!this._connected);

        return new Promise((resolve, reject) => {
            const onOpen = () => {
                const data = {
                    type: "PING",
                };
                const message = JSON.stringify(data);

                this._ws.send(message);
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
                    this._connected = true;

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
                this._ws.on("close", this._onClose.bind(this));

                return undefined;
            });
    }

    _onClose() {
        this.disconnect();
    }

    disconnect() {
        return Promise.try(() => {
            if (!this._connected) {
                // console.warn("Already disconnected.");
                return;
            }

            this._connected = false;

            return new Promise((resolve, reject) => {
                const hasClosed = () => {
                    resolve();
                };

                this._ws.once("close", hasClosed);

                /* eslint-disable promise/catch-or-return */
                Promise.delay(this.maxDisconnectWaitMilliseconds)
                    .then(() => reject(new Error("Disconnect timed out.")));
                /* eslint-enable promise/catch-or-return */

                this._ws.close();
            })
                .catch(() => {
                    /* eslint-disable no-console */
                    console.warn(`Could not disconnect within ${this.maxDisconnectWaitMilliseconds} milliseconds.`);
                    /* eslint-enable no-console */

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
        assert(this._connected);

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

            this._ws.send(message);
        });
    }
}
