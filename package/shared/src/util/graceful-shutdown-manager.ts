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
import {
    autoinject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import Rx, {
    fromEvent,
    Subject,
} from "rxjs";
import {
    EventTargetLike,
} from "rxjs/internal/observable/fromEvent";
import {
    first,
} from "rxjs/operators";

import {
    EventEmitter,
} from "events";

import PinoLogger from "./pino-logger";

type ShutdownEvent = ("exit" | "uncaughtException" | "unhandledRejection" | NodeJS.Signals);

@asrt(1)
@autoinject
export default class GracefulShutdownManager {
    private shutdownObservableInternal: Rx.Observable<void> | null;
    private shutdownSubject: Subject<void> | null;
    private shutdownPromise: Promise<void> | null;
    private subscriptions: {
        SIGBREAK: Rx.Subscription | null,
        SIGHUP: Rx.Subscription | null,
        SIGINT: Rx.Subscription | null,
        SIGQUIT: Rx.Subscription | null,
        SIGTERM: Rx.Subscription | null,
        exit: Rx.Subscription | null,
        uncaughtException: Rx.Subscription | null,
        unhandledRejection: Rx.Subscription | null,
    };
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
    ) {
        this.logger = logger.child(this.constructor.name);

        this.handleSignalEvent = this.handleSignalEvent.bind(this);
        this.handleExitEvent = this.handleExitEvent.bind(this);
        this.handleUncaughtExceptionEvent = this.handleUncaughtExceptionEvent.bind(this);
        this.handleUnhandledRejectionEvent = this.handleUnhandledRejectionEvent.bind(this);

        this.subscriptions = {
            SIGBREAK: null,
            SIGHUP: null,
            SIGINT: null,
            SIGQUIT: null,
            SIGTERM: null,
            exit: null,
            uncaughtException: null,
            unhandledRejection: null,
        };

        this.shutdownSubject = null;
        this.shutdownObservableInternal = null;
        this.shutdownPromise = null;
    }

    @asrt(0)
    public async start() {
        assert.null(this.shutdownSubject);
        assert.null(this.shutdownObservableInternal);
        assert.null(this.shutdownPromise);
        assert.null(this.subscriptions.SIGHUP);
        assert.null(this.subscriptions.SIGINT);
        assert.null(this.subscriptions.SIGQUIT);
        assert.null(this.subscriptions.SIGTERM);
        assert.null(this.subscriptions.exit);
        assert.null(this.subscriptions.uncaughtException);
        assert.null(this.subscriptions.unhandledRejection);

        this.shutdownSubject = new Rx.Subject<void>();
        this.shutdownObservableInternal = this.shutdownSubject.asObservable();

        this.shutdownPromise = this.shutdownObservableInternal
            .pipe(first())
            .toPromise()
            .then(() => {
                this.logger.warn("Detected shutdown.", "shutdownPromise");
            });

        // TODO: update rxjs or fix the type definitions for the nodejs event emitter mismatch.
        const processAsEventTargetLike = ((process as EventEmitter) as EventTargetLike);

        this.subscriptions.SIGBREAK = fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGBREAK")
            .subscribe(this.handleSignalEvent);

        this.subscriptions.SIGHUP = fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGHUP")
            .subscribe(this.handleSignalEvent);

        this.subscriptions.SIGINT = fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGINT")
            .subscribe(this.handleSignalEvent);

        this.subscriptions.SIGQUIT = fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGQUIT")
            .subscribe(this.handleSignalEvent);

        this.subscriptions.SIGTERM = fromEvent<NodeJS.Signals>(processAsEventTargetLike, "SIGTERM")
            .subscribe(this.handleSignalEvent);

        this.subscriptions.exit = fromEvent<number>(processAsEventTargetLike, "exit")
            .subscribe(this.handleExitEvent);

        this.subscriptions.uncaughtException =
            fromEvent<Error>(processAsEventTargetLike, "uncaughtException")
                .subscribe(this.handleUncaughtExceptionEvent);

        this.subscriptions.unhandledRejection =
            fromEvent(processAsEventTargetLike, "unhandledRejection", (reason, promise) => [reason, promise])
                .subscribe(([reason, promise]) => this.handleUnhandledRejectionEvent(reason, promise));
    }

    @asrt(0)
    public async stop() {
        assert.not.null(this.shutdownSubject);
        assert.not.null(this.shutdownObservableInternal);
        assert.not.null(this.shutdownPromise);
        assert.not.null(this.subscriptions.SIGBREAK);
        assert.not.null(this.subscriptions.SIGHUP);
        assert.not.null(this.subscriptions.SIGINT);
        assert.not.null(this.subscriptions.SIGQUIT);
        assert.not.null(this.subscriptions.SIGTERM);
        assert.not.null(this.subscriptions.exit);
        assert.not.null(this.subscriptions.uncaughtException);
        assert.not.null(this.subscriptions.unhandledRejection);

        this.subscriptions.SIGBREAK!.unsubscribe();
        this.subscriptions.SIGHUP!.unsubscribe();
        this.subscriptions.SIGINT!.unsubscribe();
        this.subscriptions.SIGQUIT!.unsubscribe();
        this.subscriptions.SIGTERM!.unsubscribe();
        this.subscriptions.exit!.unsubscribe();
        this.subscriptions.uncaughtException!.unsubscribe();
        this.subscriptions.unhandledRejection!.unsubscribe();

        this.shutdownPromise = null;
        this.shutdownObservableInternal = null;
        this.shutdownSubject = null;
    }

    @asrt(0)
    public async shutdown() {
        assert.not.null(this.shutdownSubject);

        // TODO: better null handling.
        this.shutdownSubject!.next();
    }

    public get shutdownObservable(): Rx.Observable<void> {
        assert.not.null(this.shutdownObservableInternal);

        // TODO: better null handling.
        return this.shutdownObservableInternal!;
    }

    @asrt(0)
    public async waitForShutdownSignal() {
        assert.not.null(this.shutdownPromise);

        return this.shutdownPromise;
    }

    @asrt(1)
    private async handleExitEvent(
        @asrt() code: number,
    ): Promise<void> {
        return this.handleEvent("exit", code);
    }

    @asrt(1)
    private async handleUncaughtExceptionEvent(
        @asrt() error: Error,
    ): Promise<void> {
        return this.handleEvent("uncaughtException", error);
    }

    // @asrt(2)
    private async handleUnhandledRejectionEvent(
        @asrt() reason: any,
        promise: Promise<any>,
    ): Promise<void> {
        return this.handleEvent("unhandledRejection", reason, promise);
    }

    @asrt(1)
    private async handleSignalEvent(
        @asrt() signalAndCode: any,
    ): Promise<void> {
        // NOTE: there seems to have been a change in signal event
        // arguments sometime between nodejs v10.0.0 and v10.2.1.
        // Attempting to handle the two cases.
        // TODO: remove workaround once settled in on a version.
        let signal: (NodeJS.Signals | null) = null;
        let code = null;

        if (Array.isArray(signalAndCode)) {
            [
                signal,
                code,
            ] = signalAndCode as [
                NodeJS.Signals,
                number
            ];
        } else if (typeof signalAndCode === "string") {
            signal = signalAndCode as NodeJS.Signals;
            code = signal;
        } else {
            throw new Error("signalAndCode");
        }

        return this.handleEvent(signal, code);
    }

    private async handleEvent(
        @asrt() shutdownEvent: ShutdownEvent,
        ...args: any[],
    ): Promise<void> {
        assert.equal(typeof shutdownEvent, "string");

        const argsAsStrings = args.map((arg) => {
            if (arg) {
                return arg.toString();
            }

            return arg;
        });

        this.logger.debug(shutdownEvent, "Received shutdown event", ...argsAsStrings);

        this.shutdown();
    }
}
