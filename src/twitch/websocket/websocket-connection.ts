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
import Rx,
{
    ConnectableObservable,
    Observer,
    Subscription,
} from "rxjs";
import {
    WebSocketSubject,
} from "rxjs/internal/observable/dom/WebSocketSubject";
import {
    NextObserver,
} from "rxjs/internal/observer";

import http from "http";
import WebSocket from "ws";

import PinoLogger from "../../util/pino-logger";
import IWebSocketError from "../iweb-socket-error";
import IWebSocketCommand from "./iwebsocket-command";
import IWebSocketConnection from "./iwebsocket-connection";

export default abstract class WebSocketConnection<T, V> implements IWebSocketConnection<T, V> {
    private _sharedWebSocketObservable: Rx.Observable<any> | null;
    private _websocketSubcription: Rx.Subscription | null;
    private _websocketSubject: WebSocketSubject<any> | null;
    private _protocol?: string;
    private _uri: string;
    protected _logger: PinoLogger;

    constructor(logger: PinoLogger, uri: string, protocol?: string) {
        assert(arguments.length === 2 || arguments.length === 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof uri, "string");
        assert.nonEmptyString(uri);
        assert(uri.startsWith("wss://"));
        assert(typeof protocol === "undefined" || (typeof protocol === "string" && protocol.length > 0));

        this._logger = logger.child("WebSocketConnection");
        this._uri = uri;
        this._protocol = protocol;

        this._websocketSubject = null;
        this._websocketSubcription = null;
        this._sharedWebSocketObservable = null;
    }

    public async connect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.null(this._websocketSubject);
        assert.null(this._websocketSubcription);

        const openedObserver: Observer<any> = {
            complete: () => {
                this._logger.trace("complete", "openedObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this._logger.error(error, "error", "openedObserver");
            },
            next: (message) => {
                this._logger.trace(message, "next", "openedObserver");
            },
        };

        const openObserver: NextObserver<Event> = {
            next: (event) => {
                // this._logger.trace(event, "next", "openObserver");
                this._logger.debug("next", "openObserver");

                this._sendLoginCommands()
                    .subscribe(connectedSubject);
            },
        };

        const closeObserver: NextObserver<Event> = {
            next: (event) => {
                // this._logger.trace(event, "next", "closeObserver");
                this._logger.debug("next", "closeObserver");
            },
        };

        // TODO: log sending data through the websocket.
        this._websocketSubject = Rx.Observable.webSocket<string>({
            WebSocketCtor: WebSocket as any,
            protocol: this._protocol,
            url: this._uri,

            resultSelector: (messageEvent) => messageEvent.data,

            closeObserver,
            openObserver,
            // closingObserver: ...
        });

        this._sharedWebSocketObservable = this._websocketSubject.share()
            .concatMap((message) => Rx.Observable.from(this._parseMessage(message)));

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

        // TODO: verify that the refcount reaches 0 for a proper websocket "close".
        // TODO: force websocket termination after a "close" timeout.
        this._websocketSubcription.unsubscribe();
        this._websocketSubject.complete();
    }

    public async reconnect(): Promise<void> {
        assert.hasLength(arguments, 0);

        return this.disconnect()
            .then(() => this.connect());
    }

    public async send(data: V): Promise<void> {
        return this._send(data);
    }

    public get dataObservable(): Rx.Observable<any> {
        assert.hasLength(arguments, 0);
        assert.not.null(this._sharedWebSocketObservable);

        // TODO: better null handling.
        return this._sharedWebSocketObservable!;
    }

    protected abstract async _getSetupConnectionCommands(): Promise<Array<IWebSocketCommand<T>>>;

    protected abstract async _parseMessage(rawMessage: string): Promise<T>;

    private async _send(data: V) {
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

    private _sendLoginCommands(): Rx.Observable<void> {
        const commandObservables = Rx.Observable.from(this._getSetupConnectionCommands())
            .concatMap((setupConnectionCommands) => Rx.Observable.from(setupConnectionCommands)
                .map((setupConnectionCommand) => {
                    // TODO: cleaner mapping?
                    // TODO: immutable.
                    setupConnectionCommand.commands = setupConnectionCommand.commands.map((command) => {
                        if (typeof command === "string") {
                            return command;
                        }

                        return JSON.stringify(command);
                    });

                    return setupConnectionCommand;
                })
                .concatMap(({ commands, verifier }) =>
                    Rx.Observable.from(this._sendCommandsAndVerifyResponse(commands, verifier))),
        );

        const allLoginCommandsObservable = Rx.Observable.concat(commandObservables);

        return allLoginCommandsObservable;
    }

    private _sendCommandsAndVerifyResponse(
        cmds: string[],
        verifier: (message: T) => boolean,
    ): Rx.Observable<void> {
        assert.hasLength(arguments, 2);
        assert.nonEmptyArray(cmds);
        assert.equal(typeof verifier, "function");

        assert.not.null(this._websocketSubject);

        if (!(this._websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this._websocketSubject must be WebSocketSubject");
        }

        const loginCommandsObservable = Rx.Observable.from(cmds)
            .do((val) => this._logger.trace(val, "Before sending", "loginCommandsObservable"))
            .flatMap((cmd) => {
                if (!(this._sharedWebSocketObservable instanceof Rx.Observable)) {
                    throw new TypeError("this._openedWebSocketSubject must be WebSocketSubject");
                }

                // TODO: timeout waiting for a verifiable message?
                const verifiedCommandsObservable = this._sharedWebSocketObservable
                    .do((val) => this._logger.trace(val, "unverified", "verifiedCommandsObservable"))
                    .first(verifier)
                    .do((val) => this._logger.trace(val, "verified", "verifiedCommandsObservable"))
                    .mapTo(undefined);

                // TODO: is this a hack? Should loginCommandsObservable be subscribed to _websocketSubject?
                // NOTE: could be performed separately, outside of this map function?
                this._websocketSubject!.next(cmd);

                return verifiedCommandsObservable;
            })
            .do((val) => this._logger.trace(val, "After sending", "loginCommandsObservable"));

        return loginCommandsObservable;
    }
}
