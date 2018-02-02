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

import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import http from "http";
import WebSocket from "ws";

import PinoLogger from "../../util/pino-logger";
import IWebSocketError from "../iweb-socket-error";
import IIRCConnection from "./iirc-connection";
import IParsedMessage from "./iparsed-message";

type KillSwitch = () => void;
type DataHandler = (data: any) => void;
type DataFilter = (data: any) => boolean;
interface IDataHandlerObject {
    handler: DataHandler;
    filter: DataFilter;
}

export default class IrcConnection implements IIRCConnection {
    private _dataHandlerObjects: IDataHandlerObject[];
    private _maxDisconnectWaitMilliseconds: number;
    private _ws: WebSocket | null;
    private _userAccessTokenProvider: any;
    private _username: string;
    private _channel: string;
    private _uri: string;
    private _logger: PinoLogger;

    constructor(logger: PinoLogger, uri: string, channel: string, username: string, userAccessTokenProvider) {
        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof uri, "string");
        assert.greater(uri.length, 0);
        assert(uri.startsWith("wss://"));
        assert.equal(typeof channel, "string");
        assert.greater(channel.length, 0);
        assert.equal(typeof username, "string");
        assert.greater(username.length, 0);
        assert.equal(typeof userAccessTokenProvider, "function");

        this._logger = logger.child("IrcConnection");
        this._uri = uri;
        this._channel = channel;
        this._username = username;
        this._userAccessTokenProvider = userAccessTokenProvider;

        this._ws = null;
        this._maxDisconnectWaitMilliseconds = 10 * 1000;
        this._dataHandlerObjects = [];
    }

    public async connect() {
        assert.hasLength(arguments, 0);
        assert.equal(this._ws, null);

        this._ws = new WebSocket(this._uri, "irc");

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

                        const setupConnectionCommands = [
                            {
                                cmds: [
                                    `CAP REQ :${capabilitiesString}`,
                                ],
                                verifier: (message: string) => message.includes("CAP * ACK"),
                            },

                            {
                                cmds: [
                                    // NOTE: the user access token needs to have an "oauth:" prefix.
                                    `PASS oauth:${userAccessToken}`,
                                    `NICK ${this._username}`,
                                ],
                                // NOTE: the "001" message might change, but for now it's a hardcoded return value.
                                // https://dev.twitch.tv/docs/irc#connecting-to-twitch-irc
                                verifier: (message: string) => message.includes("001"),
                            },

                            {
                                cmds: [
                                    `JOIN ${this._channel}`,
                                ],
                                verifier: (message: string) => message.includes(`JOIN ${this._channel}`),
                            },
                        ];

                        return Bluebird.mapSeries(
                            setupConnectionCommands,
                            ({ cmds, verifier }) => this._sendCommandsAndVerifyResponse(cmds, verifier),
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

            const onError = (error: IWebSocketError) => {
                unregisterListeners();

                this.disconnect();

                reject(error);
            };

            const registerListeners = () => {
                if (!(this._ws instanceof WebSocket)) {
                    throw new TypeError("this._ws must be WebSocket");
                }

                this._ws.once("open", onOpen);
                this._ws.once("error", onError);
            };

            const unregisterListeners = () => {
                if (!(this._ws instanceof WebSocket)) {
                    throw new TypeError("this._ws must be WebSocket");
                }

                this._ws.removeListener("open", onOpen);
                this._ws.removeListener("error", onError);
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
                this._ws.on("message", this._onMessage.bind(this));

                return undefined;
            });
    }

    public async disconnect() {
        assert.hasLength(arguments, 0);
        assert.not.equal(this._ws, null);

        if (!(this._ws instanceof WebSocket)) {
            throw new TypeError("this._ws must be WebSocket");
        }

        if (this._ws.readyState !== WebSocket.OPEN) {
            this._logger.trace("Already disconnected.");

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

    public async reconnect() {
        assert.hasLength(arguments, 0);

        return this.disconnect()
            .then(() => this.connect());
    }

    public async send(data: any): Promise<void> {
        return this._send(data);
    }

    public async listen(handler: DataHandler, filter: DataFilter): Promise<KillSwitch> {
        assert.hasLength(arguments, 2);
        assert.equal(typeof handler, "function");
        assert.equal(typeof filter, "function");
        assert.not.equal(this._ws, null);

        const dataHandlerObject: IDataHandlerObject = {
            filter,
            handler,
        };

        this._dataHandlerObjects.push(dataHandlerObject);

        const killSwitch = () => {
            this._dataHandlerObjects = this._dataHandlerObjects
                .filter((_dataHandler) => _dataHandler !== dataHandlerObject);
        };

        return killSwitch;
    }

    private async _sendCommandsAndVerifyResponse(cmds: string[], verifier: (message: string) => boolean) {
        assert.hasLength(arguments, 2);
        assert(Array.isArray(cmds));
        assert.greater(cmds.length, 0);
        assert.equal(typeof verifier, "function");

        return new Promise((resolve, reject) => {
            const errorHandler = (error: IWebSocketError) => {
                unregisterListeners();

                reject(error);
            };

            const messageHandler = (message: string) => {
                const matchingMessage = verifier(message);

                if (matchingMessage) {
                    unregisterListeners();

                    resolve();
                }
            };

            const registerListeners = () => {
                if (!(this._ws instanceof WebSocket)) {
                    throw new TypeError("this._ws must be WebSocket");
                }

                this._ws.on("error", errorHandler);
                this._ws.on("message", messageHandler);
            };

            const unregisterListeners = () => {
                if (!(this._ws instanceof WebSocket)) {
                    throw new TypeError("this._ws must be WebSocket");
                }

                this._ws.removeListener("error", errorHandler);
                this._ws.removeListener("message", messageHandler);
            };

            registerListeners();

            Bluebird.mapSeries(
                cmds,
                (cmd) => this._send(cmd),
            )
                .catch((error) => {
                    reject(error);
                });
        });
    }

    private async _send(data: any) {
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

    private _onError(error: IWebSocketError) {
        this._logger.error(error, "_onError");
    }

    private _onUnexpectedResponse(request: http.ClientRequest, response: http.IncomingMessage): void {
        this._logger.error(request, response, "_onUnexpectedResponse");
    }

    private _onClose(code: number, reason: string): void {
        this.disconnect();
    }

    private async _parseMessage(rawMessage: string): Promise<IParsedMessage> {
        // This is an example of an IRC message with tags. I split it across
        // multiple lines for readability.

        // @badges=global_mod/1,turbo/1;color=#0D4200;display-name=TWITCH_UserNaME;emotes=25:0-4,12-16/1902:6-10;mod=0;room-id=1337;subscriber=0;turbo=1;user-id=1337;user-type=global_mod
        // :twitch_username!twitch_username@twitch_username.tmi.twitch.tv
        // PRIVMSG
        // #channel
        // :Kappa Keepo Kappa

        const parsedMessage: IParsedMessage = {
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
                (obj: any, tag) => {
                    const parts = tag.split("=");
                    const key = parts[0];
                    const value = parts[1];

                    // NOTE: handle the case of having repeated tag keys.
                    // NOTE: this means a parsed tag value can be either a string or an array of strings.
                    obj[key] = obj[key]
                        ? new Array().concat(obj[key])
                            .concat(value)
                        : value;

                    return obj;
                },
                {},
            );
        } else if (rawMessage.startsWith("PING")) {
            parsedMessage.command = "PING";
            parsedMessage.message = rawMessage.split(":")[1];
        }

        return parsedMessage;
    }

    private async _onMessage(message: string) {
        assert.hasLength(arguments, 1);

        const data = await this._parseMessage(message);

        // TODO: try-catch for bad handlers.
        await this._dataHandler(data);
    }

    private async _dataHandler(data: any) {
        assert.hasLength(arguments, 1);

        const applicableHandlers = await Bluebird.filter(
            this._dataHandlerObjects,
            (dataHandler) => Promise.resolve(dataHandler.filter(data))
                .catch((error) => {
                    this._logger.warn(error, `Masking error in filter ${dataHandler.filter.name}`);

                    // NOTE: assume that the handler shold not be executed when the filter crashes.
                    return false;
                }),
        );

        await Bluebird.each(
            applicableHandlers,
            (dataHandler) => Promise.resolve(dataHandler.handler(data))
                .catch((error) => {
                    this._logger.warn(error, `Masking error in dataHandler ${dataHandler.handler.name}`);

                    return undefined;
                }),
        );
    }
}
