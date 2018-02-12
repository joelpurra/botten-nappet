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
import Rx, {
    Subject,
} from "rxjs";
import {
    EventTargetLike,
} from "rxjs/internal/observable/FromEventObservable";

import {
    EventEmitter,
} from "events";

import PinoLogger from "./pino-logger";

type ShutdownEvent = ("exit" | "uncaughtException" | "unhandledRejection" | NodeJS.Signals);
type ShutdownHandler = () => void;

export default class GracefulShutdownManager {
    private _shutdownObservable: Rx.Observable<void> | null;
    private _shutdownSubject: Subject<void> | null;
    private _shutdownPromise: Promise<void> | null;
    private _subscriptions: {
        SIGBREAK: Rx.Subscription | null,
        SIGHUP: Rx.Subscription | null,
        SIGINT: Rx.Subscription | null,
        SIGQUIT: Rx.Subscription | null,
        SIGTERM: Rx.Subscription | null,
        exit: Rx.Subscription | null,
        uncaughtException: Rx.Subscription | null,
        unhandledRejection: Rx.Subscription | null,
    };
    private _logger: PinoLogger;

    constructor(logger: PinoLogger) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof logger, "object");

        this._logger = logger.child("GracefulShutdownManager");

        this._handleSignalEvent = this._handleSignalEvent.bind(this);
        this._handleExitEvent = this._handleExitEvent.bind(this);
        this._handleUncaughtExceptionEvent = this._handleUncaughtExceptionEvent.bind(this);
        this._handleUnhandledRejectionEvent = this._handleUnhandledRejectionEvent.bind(this);

        this._subscriptions = {
            SIGBREAK: null,
            SIGHUP: null,
            SIGINT: null,
            SIGQUIT: null,
            SIGTERM: null,
            exit: null,
            uncaughtException: null,
            unhandledRejection: null,
        };

        this._shutdownSubject = null;
        this._shutdownObservable = null;
        this._shutdownPromise = null;
    }

    public async start() {
        assert.hasLength(arguments, 0);
        assert.null(this._shutdownSubject);
        assert.null(this._shutdownObservable);
        assert.null(this._shutdownPromise);
        assert.null(this._subscriptions.SIGHUP);
        assert.null(this._subscriptions.SIGINT);
        assert.null(this._subscriptions.SIGQUIT);
        assert.null(this._subscriptions.SIGTERM);
        assert.null(this._subscriptions.exit);
        assert.null(this._subscriptions.uncaughtException);
        assert.null(this._subscriptions.unhandledRejection);

        this._shutdownSubject = new Rx.Subject<void>();
        this._shutdownObservable = this._shutdownSubject.asObservable();

        this._shutdownPromise = this._shutdownObservable
            .first()
            .toPromise()
            .then(() => {
                this._logger.warn("Detected shutdown.", "_shutdownPromise");
            });

        // TODO: update rxjs or fix the type definitions for the nodejs event emitter mismatch.
        const processAsEventTargetLike = ((process as EventEmitter) as EventTargetLike);

        this._subscriptions.SIGBREAK = Rx.Observable.fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGBREAK")
            .subscribe(this._handleSignalEvent);

        this._subscriptions.SIGHUP = Rx.Observable.fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGHUP")
            .subscribe(this._handleSignalEvent);

        this._subscriptions.SIGINT = Rx.Observable.fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGINT")
            .subscribe(this._handleSignalEvent);

        this._subscriptions.SIGQUIT = Rx.Observable.fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGQUIT")
            .subscribe(this._handleSignalEvent);

        this._subscriptions.SIGTERM = Rx.Observable.fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGTERM")
            .subscribe(this._handleSignalEvent);

        this._subscriptions.exit = Rx.Observable.fromEvent<number>(processAsEventTargetLike, "exit")
            .subscribe(this._handleExitEvent);

        this._subscriptions.uncaughtException = Rx.Observable
            .fromEvent<Error>(processAsEventTargetLike, "uncaughtException")
            .subscribe(this._handleUncaughtExceptionEvent);

        this._subscriptions.unhandledRejection = Rx.Observable
            .fromEvent(processAsEventTargetLike, "unhandledRejection", (reason, promise) => [reason, promise])
            .subscribe(([reason, promise]) => this._handleUnhandledRejectionEvent(reason, promise));
    }

    public async stop() {
        assert.hasLength(arguments, 0);
        assert.not.null(this._shutdownSubject);
        assert.not.null(this._shutdownObservable);
        assert.not.null(this._shutdownPromise);
        assert.not.null(this._subscriptions.SIGBREAK);
        assert.not.null(this._subscriptions.SIGHUP);
        assert.not.null(this._subscriptions.SIGINT);
        assert.not.null(this._subscriptions.SIGQUIT);
        assert.not.null(this._subscriptions.SIGTERM);
        assert.not.null(this._subscriptions.exit);
        assert.not.null(this._subscriptions.uncaughtException);
        assert.not.null(this._subscriptions.unhandledRejection);

        this._subscriptions.SIGBREAK!.unsubscribe();
        this._subscriptions.SIGHUP!.unsubscribe();
        this._subscriptions.SIGINT!.unsubscribe();
        this._subscriptions.SIGQUIT!.unsubscribe();
        this._subscriptions.SIGTERM!.unsubscribe();
        this._subscriptions.exit!.unsubscribe();
        this._subscriptions.uncaughtException!.unsubscribe();
        this._subscriptions.unhandledRejection!.unsubscribe();

        this._shutdownPromise = null;
        this._shutdownObservable = null;
        this._shutdownSubject = null;
    }

    public async shutdown() {
        assert.hasLength(arguments, 0);
        assert.not.null(this._shutdownSubject);

        // TODO: better null handling.
        this._shutdownSubject!.next();
    }

    public get shutdownObservable(): Rx.Observable<void> {
        assert.hasLength(arguments, 0);
        assert.not.null(this._shutdownObservable);

        // TODO: better null handling.
        return this._shutdownObservable!;
    }

    public async waitForShutdownSignal() {
        assert.hasLength(arguments, 0);
        assert.not.null(this._shutdownPromise);

        return this._shutdownPromise;
    }

    private async _handleExitEvent(code: number): Promise<void> {
        return this._handleEvent("exit", code);
    }

    private async _handleUncaughtExceptionEvent(error: Error): Promise<void> {
        return this._handleEvent("uncaughtException", error);
    }

    private async _handleUnhandledRejectionEvent(reason: any, promise: Promise<any>): Promise<void> {
        return this._handleEvent("unhandledRejection", reason, promise);
    }

    private async _handleSignalEvent(signal: NodeJS.Signals): Promise<void> {
        return this._handleEvent(signal, signal);
    }

    private async _handleEvent(shutdownEvent: ShutdownEvent, ...args: any[]): Promise<void> {
        // TODO: test/ensure that the right number of arguments are passed from each event/signal type.
        // assert.hasLength(arguments, 1);
        assert.equal(typeof shutdownEvent, "string");

        this._logger.debug(shutdownEvent, "Received shutdown event", ...args);

        this.shutdown();
    }
}
