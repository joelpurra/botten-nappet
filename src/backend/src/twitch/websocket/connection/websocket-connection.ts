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
    Observer,
    Subscription,
} from "rxjs";
import {
    WebSocketSubject,
} from "rxjs/internal/observable/dom/WebSocketSubject";
import {
    NextObserver,
} from "rxjs/internal/observer";

import WebSocket from "ws";

import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import IWebSocketCommand from "../interface/iwebsocket-command";
import IWebSocketConnection from "./iwebsocket-connection";

export default abstract class WebSocketConnection<T, V> implements IWebSocketConnection<T, V> {
    protected logger: PinoLogger;
    private sharedWebSocketObservable: Rx.Observable<any> | null;
    private websocketSubcription: Rx.Subscription | null;
    private websocketSubject: WebSocketSubject<any> | null;

    constructor(
        logger: PinoLogger,
        private uri: string,
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

    public async connect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.null(this.websocketSubject);
        assert.null(this.websocketSubcription);

        const openedObserver: Observer<any> = {
            complete: () => {
                this.logger.trace("complete", "openedObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this.logger.error(error, "error", "openedObserver");
            },
            next: (message) => {
                this.logger.trace(message, "next", "openedObserver");
            },
        };

        const openObserver: NextObserver<Event> = {
            next: (event) => {
                // this._logger.trace(event, "next", "openObserver");
                this.logger.debug("next", "openObserver");

                this.sendLoginCommands()
                    .subscribe(connectedSubject);
            },
        };

        const closeObserver: NextObserver<Event> = {
            next: (event) => {
                // this._logger.trace(event, "next", "closeObserver");
                this.logger.debug("next", "closeObserver");
            },
        };

        // TODO: log sending data through the websocket.
        this.websocketSubject = Rx.Observable.webSocket<string>({
            WebSocketCtor: WebSocket as any,
            protocol: this.protocol,
            url: this.uri,

            resultSelector: (messageEvent) => messageEvent.data,

            closeObserver,
            openObserver,
            // closingObserver: ...
        });

        this.sharedWebSocketObservable = this.websocketSubject.share()
            .concatMap((message) => Rx.Observable.from(this.parseMessage(message)));

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

    public async disconnect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.null(this.websocketSubject);
        assert.not.null(this.websocketSubcription);

        if (!(this.websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this._websocketSubject must be WebSocketSubject");
        }

        if (!(this.websocketSubcription instanceof Subscription)) {
            throw new TypeError("this._websocketSubcription must be Subscription");
        }

        // TODO: verify that the refcount reaches 0 for a proper websocket "close".
        // TODO: force websocket termination after a "close" timeout.
        this.websocketSubcription.unsubscribe();
        this.websocketSubject.complete();
    }

    public async reconnect(): Promise<void> {
        assert.hasLength(arguments, 0);

        await this.disconnect();
        await this.connect();
    }

    public async send(data: V): Promise<void> {
        return this.sendInternal(data);
    }

    public get dataObservable(): Rx.Observable<any> {
        assert.hasLength(arguments, 0);
        assert.not.null(this.sharedWebSocketObservable);

        // TODO: better null handling.
        return this.sharedWebSocketObservable!;
    }

    protected abstract async getSetupConnectionCommands(): Promise<Array<IWebSocketCommand<T, V>>>;

    protected abstract async parseMessage(rawMessage: string): Promise<T>;

    protected abstract async serializeMessage(data: V): Promise<string>;

    private async sendInternal(data: V): Promise<void> {
        assert.hasLength(arguments, 1);
        assert(data !== undefined && data !== null);
        assert.not.null(this.websocketSubject);

        if (!(this.websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this._websocketSubject must be WebSocketSubject");
        }

        const message = await this.serializeMessage(data);

        this.logger.debug(data, message.length, "sendInternal");

        this.websocketSubject.next(message);
    }

    private sendLoginCommands(): Rx.Observable<void> {
        const commandObservables = Rx.Observable.from(this.getSetupConnectionCommands())
            .concatMap((setupConnectionCommands) => Rx.Observable.from(setupConnectionCommands)
                .concatMap(({ commands, verifier }) =>
                    Rx.Observable.from(this.sendCommandsAndVerifyResponse(commands, verifier))),
        );

        const allLoginCommandsObservable = Rx.Observable.concat(commandObservables);

        return allLoginCommandsObservable;
    }

    private sendCommandsAndVerifyResponse(
        cmds: V[],
        verifier: (message: T) => boolean,
    ): Rx.Observable<void> {
        assert.hasLength(arguments, 2);
        assert.nonEmptyArray(cmds);
        assert.equal(typeof verifier, "function");

        assert.not.null(this.websocketSubject);

        if (!(this.websocketSubject instanceof WebSocketSubject)) {
            throw new TypeError("this._websocketSubject must be WebSocketSubject");
        }

        const loginCommandsObservable = Rx.Observable.from(cmds)
            .do((val) => this.logger.trace(val, "Before sending", "loginCommandsObservable"))
            .flatMap((cmd) => {
                if (!(this.sharedWebSocketObservable instanceof Rx.Observable)) {
                    throw new TypeError("this._openedWebSocketSubject must be WebSocketSubject");
                }

                // TODO: timeout waiting for a verifiable message?
                const verifiedCommandsObservable = this.sharedWebSocketObservable
                    .do((val) => this.logger.trace(val, "unverified", "verifiedCommandsObservable"))
                    .first(verifier)
                    .do((val) => this.logger.trace(val, "verified", "verifiedCommandsObservable"))
                    .mapTo(undefined);

                // TODO: is this a hack? Should loginCommandsObservable be subscribed to _websocketSubject?
                // NOTE: could be performed separately, outside of this map function?
                this.sendInternal(cmd);

                return verifiedCommandsObservable;
            })
            .do((val) => this.logger.trace(val, "After sending", "loginCommandsObservable"));

        return loginCommandsObservable;
    }
}
