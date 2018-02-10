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
import Rx,
{
    ConnectableObservable, Observer, Subscription,
} from "rxjs";

import {
    NextObserver,
} from "rxjs/internal/observer";

import {
    WebSocketSubject,
} from "rxjs/internal/observable/dom/WebSocketSubject";

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
    private _sharedWebSocketObservable: Rx.Observable<any> | null;
    private _websocketSubcription: Rx.Subscription | null;
    private _dataHandlerObjects: IDataHandlerObject[];
    private _websocketSubject: WebSocketSubject<any> | null;
    private _userAccessTokenProvider: any;
    private _username: string;
    private _channel: string;
    private _uri: string;
    private _logger: PinoLogger;

    constructor(logger: PinoLogger, uri: string, channel: string, username: string, userAccessTokenProvider) {
        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof uri, "string");
        assert.nonEmptyString(uri);
        assert(uri.startsWith("wss://"));
        assert.equal(typeof channel, "string");
        assert.nonEmptyString(channel);
        assert(channel.startsWith("#"));
        assert.equal(typeof username, "string");
        assert.nonEmptyString(username);
        assert.equal(typeof userAccessTokenProvider, "function");

        this._logger = logger.child("IrcConnection");
        this._uri = uri;
        this._channel = channel;
        this._username = username;
        this._userAccessTokenProvider = userAccessTokenProvider;

        this._websocketSubject = null;
        this._websocketSubcription = null;
        this._sharedWebSocketObservable = null;
        this._dataHandlerObjects = [];
    }

    public async connect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.null(this._websocketSubject);
        assert.null(this._websocketSubcription);

        const userAccessToken = await this._userAccessTokenProvider();

        const openedObserver: Observer<string> = {
            complete: () => {
                this._logger.trace("complete", "openedObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this._logger.error(error, "error", "openedObserver");
            },
            next: (message) => {
                this._logger.trace(message, "next", "openedObserver");

                // TODO: convert rest of application to use obserables.
                this._onMessage(message);
            },
        };

        const openObserver: Observer<Event> = {
            complete: () => {
                this._logger.trace("complete", "openObserver");
            },
            error: (error) => {
                this._logger.error(error, "error", "openObserver");
            },
            next: (event) => {
                // this._logger.trace(event, "next", "openObserver");
                this._logger.debug("next", "openObserver");

                this._sendLoginCommands(userAccessToken)
                    .subscribe(connectedSubject);
            },
        };

        const closeObserver: Observer<Event> = {
            complete: () => {
                this._logger.trace("complete", "closeObserver");

                this._websocketSubcription = null;
                this._websocketSubject = null;
            },
            error: (error) => {
                // TODO: handle errors.
                this._logger.error(error, "error", "closeObserver");
            },
            next: (event) => {
                // this._logger.trace(event, "next", "closeObserver");
                this._logger.debug("next", "closeObserver");
            },
        };

        // TODO: log sending data through the websocket.
        this._websocketSubject = Rx.Observable.webSocket({
            WebSocketCtor: WebSocket as any,
            protocol: "irc",
            url: this._uri,

            resultSelector: (messageEvent) => messageEvent.data,

            closeObserver,
            openObserver,
            // closingObserver: ...
        });

        this._sharedWebSocketObservable = this._websocketSubject.share();
        this._websocketSubcription = this._sharedWebSocketObservable.subscribe(openedObserver);

        const connectedSubject = new Rx.Subject<void>();

        const connectedPromise = Bluebird.resolve(connectedSubject.asObservable().toPromise());

        return connectedPromise
            .tap(() => {
                this._logger.debug("connectedPromise");
            })
            .tapCatch((error) => {
                this._logger.error(error, "connectedPromise");
            });
    }

    public async disconnect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.null(this._websocketSubject);
        assert.not.null(this._websocketSubcription);

        if (!(this._websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this._websocketSubject must be WebSocketSubject");
        }

        if (!(this._websocketSubcription instanceof Subscription)) {
            throw new TypeError("this._websocketSubcription must be Subscription");
        }

        // TODO: is this the right way to close the unrelying websocket?
        this._websocketSubcription.unsubscribe();
        this._websocketSubject.complete();
    }

    public async reconnect(): Promise<void> {
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
        assert.not.equal(this._websocketSubject, null);

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

    private _sendLoginCommands(userAccessToken: string): Rx.Observable<void> {
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

        const commandObservables = Rx.Observable.from(setupConnectionCommands)
            .map(({ cmds, verifier }) => {
                return this._sendCommandsAndVerifyResponse(cmds, verifier);
            })
            .mergeAll();

        const allLoginCommandsObservable = Rx.Observable.concat(commandObservables);

        return allLoginCommandsObservable;
    }

    private _sendCommandsAndVerifyResponse(
        cmds: string[],
        verifier: (message: string) => boolean,
    ): Rx.Observable<void> {
        assert.hasLength(arguments, 2);
        assert.nonEmptyArray(cmds);
        assert.equal(typeof verifier, "function");

        assert.not.null(this._websocketSubject);

        if (!(this._websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this._websocketSubject must be WebSocketSubject");
        }

        const loginCommandsObservable = Rx.Observable.from(cmds)
            .do((val) => this._logger.trace(val, "loginCommandsObservable"))
            .map((cmd) => {
                // TODO: is this a hack? Should loginCommandsObservable be subscribed to _websocketSubject?
                // NOTE: could be performed separately, outside of this map function?
                this._websocketSubject!.next(cmd);

                if (!(this._sharedWebSocketObservable instanceof Rx.Observable)) {
                    throw new TypeError("this._openedWebSocketSubject must be WebSocketSubject");
                }

                return this._sharedWebSocketObservable
                    .filter(verifier)
                    .mergeAll<void>();
            });

        return loginCommandsObservable;
    }

    private async _send(data: any) {
        assert.hasLength(arguments, 1);
        assert(data !== undefined && data !== null);
        assert.not.null(this._websocketSubject);

        if (!(this._websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this._websocketSubject must be WebSocketSubject");
        }

        let message = null;

        if (typeof data === "string") {
            message = data;
        } else {
            message = JSON.stringify(data);
        }

        this._logger.debug(data, message.length, "_send");

        this._websocketSubject.next(message);
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
