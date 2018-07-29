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
    NodeStyleEventEmitter,
} from "rxjs/internal/observable/fromEvent";
import {
    first,
} from "rxjs/operators";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

type ShutdownEvent = ("exit" | "uncaughtException" | "unhandledRejection" | NodeJS.Signals);

@asrt(1)
@autoinject
export default class GracefulShutdownManager {
    private shutdownObservableInternal: Rx.Observable<void> | null = null;
    private shutdownSubject: Subject<void> | null = null;
    private shutdownPromise: Promise<void> | null = null;
    private subscriptions: {
        [key: string]: Rx.Subscription | null,
        SIGBREAK: Rx.Subscription | null,
        SIGHUP: Rx.Subscription | null,
        SIGINT: Rx.Subscription | null,
        SIGQUIT: Rx.Subscription | null,
        SIGTERM: Rx.Subscription | null,
        exit: Rx.Subscription | null,
        uncaughtException: Rx.Subscription | null,
        unhandledRejection: Rx.Subscription | null,
    } = {
            SIGBREAK: null,
            SIGHUP: null,
            SIGINT: null,
            SIGQUIT: null,
            SIGTERM: null,
            exit: null,
            uncaughtException: null,
            unhandledRejection: null,
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

        const signals: NodeJS.Signals[] = [
            "SIGBREAK",
            "SIGHUP",
            "SIGINT",
            "SIGQUIT",
            "SIGTERM",
        ];

        signals.forEach((signal) => {
            this.subscriptions[signal] = fromEvent<NodeJS.Signals>(
                process as NodeStyleEventEmitter,
                signal,
            )
                .subscribe(this.handleSignalEvent.bind(null, signal));
        });

        this.subscriptions.exit = fromEvent<number>(process as NodeStyleEventEmitter, "exit")
            .subscribe(this.handleExitEvent);

        this.subscriptions.uncaughtException =
            fromEvent<Error>(process as NodeStyleEventEmitter, "uncaughtException")
                .subscribe(this.handleUncaughtExceptionEvent);

        this.subscriptions.unhandledRejection =
            fromEvent(process as NodeStyleEventEmitter, "unhandledRejection", (reason, promise) => [reason, promise])
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

    private async handleSignalEvent(
        signalAndCode: any,
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
                /* tslint:disable:trailing-comma */
                code
                /* tslint:enable:trailing-comma */
            ] = signalAndCode as [
                NodeJS.Signals,
                number
            ];
        } else if (typeof signalAndCode === "string") {
            signal = signalAndCode as NodeJS.Signals;
            code = signal;
        } else {
            // NOTE: ignore type mismatches on this level.
            // throw new Error("signalAndCode");
            signal = "SIGUNUSED";
            code = `Unknown event signal/code: ${signalAndCode}`;
        }

        return this.handleEvent(signal, code);
    }

    private async handleEvent(
        @asrt() shutdownEvent: ShutdownEvent,
        /* tslint:disable:trailing-comma */
        ...args: any[]
        /* tslint:enable:trailing-comma */
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
