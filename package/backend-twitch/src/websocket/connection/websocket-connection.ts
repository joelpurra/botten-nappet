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

import {
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
import Bluebird from "bluebird";
import {
    assert,
} from "check-types";
import Rx,
{
    concat,
    from,
    NextObserver,
    Observer,
    Subscription,
} from "rxjs";
import {
    concatMap,
    first,
    map,
    mergeMap,
    share,
    takeLast,
    tap,
} from "rxjs/operators";
import {
    webSocket,
    WebSocketSubject,
} from "rxjs/webSocket";

import WebSocket from "ws";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IWebSocketConnection from "@botten-nappet/backend-twitch/src/websocket/connection/iwebsocket-connection";
import IWebSocketCommand from "@botten-nappet/interface-backend-twitch/src/event/iwebsocket-command";

@asrt()
export default abstract class WebSocketConnection<T, V> implements IWebSocketConnection<T, V> {
    protected logger: PinoLogger;
    private sharedWebSocketObservable: Rx.Observable<T> | null;
    private websocketSubcription: Rx.Subscription | null;
    private websocketSubject: WebSocketSubject<string> | null;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly uri: string,
        private protocol?: string,
    ) {
        assert(arguments.length === 2 || arguments.length === 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof uri, "string");
        assert.nonEmptyString(uri);
        assert(uri.startsWith("wss://"));
        assert(typeof protocol === "undefined" || (typeof protocol === "string" && protocol.length > 0));

        this.logger = logger.child(this.constructor.name);

        this.websocketSubject = null;
        this.websocketSubcription = null;
        this.sharedWebSocketObservable = null;
    }

    @asrt(0)
    public async connect(): Promise<void> {
        assert.null(this.websocketSubject);
        assert.null(this.websocketSubcription);

        const openedObserver: Observer<any> = {
            complete: () => {
                this.logger.trace("complete", "openedObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                // TODO: disconnect?
                this.logger.error(error, "error", "openedObserver");
            },
            next: (message) => {
                this.logger.trace(message, "next", "openedObserver");
            },
        };

        const openObserver: NextObserver<Event> = {
            next: (
                // event
            ) => {
                // this._logger.trace(event, "next", "openObserver");
                this.logger.debug("next", "openObserver");

                this.sendLoginCommands()
                    .subscribe(connectedSubject);
            },
        };

        const closeObserver: NextObserver<Event> = {
            next: (
                // event
            ) => {
                // this._logger.trace(event, "next", "closeObserver");
                this.logger.debug("next", "closeObserver");
            },
        };

        // TODO: log sending data through the websocket.
        this.websocketSubject = webSocket<string>({
            WebSocketCtor: WebSocket as any,
            protocol: this.protocol,
            url: this.uri,

            deserializer: (messageEvent) => {
                return messageEvent.data as string;
            },
            serializer: (value) => {
                return value;
            },

            closeObserver,
            openObserver,
            // closingObserver: ...
        });

        this.sharedWebSocketObservable = this.websocketSubject
            .pipe(
                share(),
        )
            .pipe(
                concatMap((message) => from(this.parseMessage(message))),
        );

        this.websocketSubcription = this.sharedWebSocketObservable.subscribe(openedObserver);

        const connectedSubject = new Rx.Subject<void>();

        const connectedPromise = Bluebird.resolve(connectedSubject.asObservable().toPromise());

        return connectedPromise
            .tap(() => {
                this.logger.debug("connectedPromise");
            })
            .tapCatch((error) => {
                this.logger.error(error, "connectedPromise");
            });
    }

    @asrt(0)
    public async disconnect(): Promise<void> {
        assert.not.null(this.websocketSubject);
        assert.not.null(this.websocketSubcription);

        if (!(this.websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this.websocketSubject must be WebSocketSubject");
        }

        if (!(this.websocketSubcription instanceof Subscription)) {
            throw new TypeError("this.websocketSubcription must be Subscription");
        }

        // TODO: verify that the refcount reaches 0 for a proper websocket "close".
        // TODO: force websocket termination after a "close" timeout.
        this.websocketSubcription.unsubscribe();
        this.websocketSubject.complete();

        this.websocketSubject = null;
        this.websocketSubcription = null;
    }

    @asrt(0)
    public async reconnect(): Promise<void> {
        await this.disconnect();
        await this.connect();
    }

    @asrt(0)
    public async isConnected(): Promise<boolean> {
        // TODO: implement a real check.
        const connected = (this.websocketSubject && this.websocketSubcription && true) || false;

        return connected;
    }

    @asrt(1)
    public async send(data: V): Promise<void> {
        return this.sendInternal(data);
    }

    public get dataObservable(): Rx.Observable<any> {
        assert.not.null(this.sharedWebSocketObservable);

        // TODO: better null handling.
        return this.sharedWebSocketObservable!;
    }

    protected abstract async getSetupConnectionCommands(): Promise<Array<IWebSocketCommand<T, V>>>;

    protected abstract async parseMessage(rawMessage: string): Promise<T>;

    protected abstract async serializeMessage(data: V): Promise<string>;

    @asrt(1)
    private async sendInternal(
        @asrt() data: V,
    ): Promise<void> {
        assert.not.null(this.websocketSubject);

        if (!(this.websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this.websocketSubject must be WebSocketSubject");
        }

        const message = await this.serializeMessage(data);

        this.logger.debug(data, message.length, "sendInternal");

        this.websocketSubject.next(message);
    }

    @asrt(0)
    private sendLoginCommands(): Rx.Observable<void> {
        const commandObservables = from(this.getSetupConnectionCommands())
            .pipe(
                concatMap(
                    (setupConnectionCommands) => from(setupConnectionCommands)
                        .pipe(
                            concatMap(
                                ({ commands, verifier }) => this.sendCommandsAndVerifyResponse(commands, verifier),
                            ),
                    ),
                ),
        );

        const allLoginCommandsObservable = concat(commandObservables);

        return allLoginCommandsObservable;
    }

    @asrt(2)
    private sendCommandsAndVerifyResponse(
        @asrt() cmds: V[],
        @asrt() verifier: (message: T) => boolean,
    ): Rx.Observable<void> {
        assert.nonEmptyArray(cmds);
        assert.equal(typeof verifier, "function");

        assert.not.null(this.websocketSubject);

        if (!(this.websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this.websocketSubject must be WebSocketSubject");
        }

        const loginCommandsObservable = from(cmds)
            .pipe(
                tap((cmd) => this.logger.trace(cmd, "Before sending", "loginCommandsObservable")),
                mergeMap(
                    (cmd) => {
                        if (!(this.sharedWebSocketObservable instanceof Rx.Observable)) {
                            throw new TypeError("this.sharedWebSocketObservable must be WebSocketSubject");
                        }

                        // TODO: timeout waiting for a verifiable message?
                        const verifiedCommandsObservable = this.sharedWebSocketObservable
                            .pipe(
                                tap(
                                    (message) =>
                                        this.logger.trace(cmd, message, "unverified", "verifiedCommandsObservable"),
                                ),
                                first((incomingWebsocketMessage) => verifier(incomingWebsocketMessage)),
                                tap(
                                    (message) =>
                                        this.logger.trace(cmd, message, "verified", "verifiedCommandsObservable"),
                                ),
                        );

                        // TODO: is this a hack? Should loginCommandsObservable be subscribed to websocketSubject?
                        // NOTE: could be performed separately, outside of this map function?
                        this.sendInternal(cmd);

                        return verifiedCommandsObservable;
                    },
                ),
                tap((val) => this.logger.trace(val, "After sending", "loginCommandsObservable")),
                takeLast(1),
                tap((val) => this.logger.trace(val, "Done sending", "loginCommandsObservable")),
                map(() => undefined),
        );

        return loginCommandsObservable;
    }
}
