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

import http from "http";
import WebSocket from "ws";

import PinoLogger from "../../util/pino-logger";
import IConnection from "../iconnection";
import IWebSocketError from "../iweb-socket-error";

// TODO: re-use.
function isString(x: any): x is string {
    return typeof x === "string";
}

type DataHandler = (topic: string, data: any) => void;
type DataFilter = (topic: string, data: any) => boolean;

export default class PubSubConnection implements IConnection {
    private _logger: PinoLogger;
    private _maxDisconnectWaitMilliseconds: number;
    private _uri: string;
    private _ws: WebSocket | null;

    constructor(logger: PinoLogger, uri: string) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof uri, "string");
        assert(uri.length > 0);
        assert(uri.startsWith("wss://"));

        this._logger = logger.child("PubSubConnection");
        this._uri = uri;

        this._ws = null;
        this._maxDisconnectWaitMilliseconds = 10 * 1000;
    }

    public async connect() {
        assert.hasLength(arguments, 0);
        assert.equal(this._ws, null);

        this._ws = new WebSocket(this._uri);

        return new Promise((resolve, reject) => {
            const onOpen = () => {
                const data = {
                    type: "PING",
                };

                this._send(data);
            };

            const onError = (event: IWebSocketError) => {
                unregisterListeners();

                this.disconnect();

                reject(event);
            };

            const onMessage = (message: WebSocket.Data) => {
                // TODO: try-catch for bad messages.
                const data = JSON.parse(message.toString());

                if (data.type === "PONG") {
                    unregisterListeners();

                    resolve();
                }
            };

            const registerListeners = () => {
                if (!(this._ws instanceof WebSocket)) {
                    throw new TypeError("this._ws must be WebSocket");
                }

                this._ws.once("open", onOpen);
                this._ws.once("error", onError);
                this._ws.on("message", onMessage);
            };

            const unregisterListeners = () => {
                if (!(this._ws instanceof WebSocket)) {
                    throw new TypeError("this._ws must be WebSocket");
                }

                this._ws.removeListener("open", onOpen);
                this._ws.removeListener("error", onError);
                this._ws.removeListener("message", onMessage);
            };

            registerListeners();
        })
            .then(() => {
                if (!(this._ws instanceof WebSocket)) {
                    throw new TypeError("this._ws must be WebSocket");
                }

                this._ws.on("error", this._onError.bind(this));
                this._ws.on("unexpected-response", this._onUnexpectedResponse.bind(this));
                this._ws.on("close", this._onClose.bind(this));

                return undefined;
            });
    }

    public async _send(data: any) {
        assert.hasLength(arguments, 1);
        assert(data !== undefined && data !== null);

        if (!(this._ws instanceof WebSocket)) {
            throw new TypeError("this._ws must be WebSocket");
        }

        let message = null;

        if (typeof data === "string") {
            message = data;
        } else {
            message = JSON.stringify(data);
        }

        this._logger.debug(data, message.length, "_send");

        this._ws.send(message);
    }

    public _onError(event: IWebSocketError): void {
        this._logger.error(event, "_onError");
    }

    public _onUnexpectedResponse(request: http.ClientRequest, response: http.IncomingMessage): void {
        this._logger.error(request, response, "_onUnexpectedResponse");
    }

    public _onClose(code: number, reason: string): void {
        this.disconnect();
    }

    public async disconnect() {
        assert.hasLength(arguments, 0);

        if (!(this._ws instanceof WebSocket)) {
            throw new TypeError("this._ws must be WebSocket");
        }

        if (this._ws.readyState !== WebSocket.OPEN) {
            // this._logger.warn("Already disconnected.");
            return;
        }

        return new Promise((resolve, reject) => {
            if (!(this._ws instanceof WebSocket)) {
                throw new TypeError("this._ws must be WebSocket");
            }

            const hasClosed = () => {
                resolve();
            };

            this._ws.once("close", hasClosed);

            Bluebird.delay(this._maxDisconnectWaitMilliseconds)
                .then(() => reject(new Error("Disconnect timed out.")));

            this._ws.close();
        })
            .catch(() => {
                if (!(this._ws instanceof WebSocket)) {
                    throw new TypeError("this._ws must be WebSocket");
                }

                this._logger.warn(`Could not disconnect within ${this._maxDisconnectWaitMilliseconds} milliseconds.`);

                // NOTE: fallback for a timed out disconnect.
                this._ws.terminate();

                return undefined;
            })
            .then(() => {
                this._ws = null;

                return undefined;
            });
    }

    public async listen(dataHandler: DataHandler, filter: DataFilter, userAccessToken: string, topics: string[]) {
        assert.hasLength(arguments, 4);
        assert.equal(typeof dataHandler, "function");
        assert.equal(typeof filter, "function");
        assert.equal(typeof userAccessToken, "string");
        assert.greater(userAccessToken.length, 0);
        assert.array(topics);
        assert.greater(topics.length, 0);

        assert.not.equal(this._ws, null);

        return new Promise((resolve, reject) => {
            if (!(this._ws instanceof WebSocket)) {
                throw new TypeError("this._ws must be WebSocket");
            }

            const onMessage = (message: WebSocket.Data) => {
                // TODO: try-catch for bad messages.
                const data = JSON.parse(message.toString());

                if (data.type !== "MESSAGE") {
                    return;
                }

                if (typeof data.data !== "object") {
                    return;
                }

                const topic = data.data.topic;

                if (!isString(topic)) {
                    return;
                }

                if (!topics.includes(topic)) {
                    return;
                }

                const messageData = JSON.parse(data.data.message);

                // TODO: try-catch for bad filters.
                const shouldHandle = filter(topic, messageData);

                if (shouldHandle === true) {
                    // TODO: try-catch for bad handlers.
                    dataHandler(topic, messageData);
                }
            };

            const onListen = (message: WebSocket.Data) => {
                if (!(this._ws instanceof WebSocket)) {
                    throw new TypeError("this._ws must be WebSocket");
                }

                // TODO: try-catch for bad messages.
                const data = JSON.parse(message.toString());

                if (data.nonce !== nonce) {
                    // NOTE: skip non-matching messages; they are presumably for other handlers.
                    return;
                }

                if (typeof data.error === "string" && data.error.length !== 0) {
                    const listenError = new Error(`Listen error: ${JSON.stringify(data.error)}`);

                    this._logger.error(listenError, data, "Listen error");

                    reject(listenError);
                }

                if (data.type !== "RESPONSE") {
                    const badTypeError = new Error(`Bad type: ${JSON.stringify(data.type)}`);

                    this._logger.error(badTypeError, data, "Bad type");

                    reject(badTypeError);
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

            const startListenData = {
                data: {
                    auth_token: userAccessToken,
                    topics,
                },
                nonce,
                type: "LISTEN",
            };

            this._ws.on("message", onListen);

            this._send(startListenData);
        });
    }
}
