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

import PinoLogger from "./pino-logger";

type ShutdownEvent = ("beforeExit" | "exit" | "uncaughtException" | "unhandledRejection" | NodeJS.Signals);
type ShutdownHandler = () => void;

export default class GracefulShutdownManager {
    private _shutdownPromise: Promise<void>;
    private _handleEvents: {
        SIGBREAK: NodeJS.SignalsListener,
        SIGHUP: NodeJS.SignalsListener,
        SIGINT: NodeJS.SignalsListener,
        SIGQUIT: NodeJS.SignalsListener,
        SIGTERM: NodeJS.SignalsListener,
        beforeExit: NodeJS.BeforeExitListener,
        exit: NodeJS.ExitListener,
        uncaughtException: NodeJS.UncaughtExceptionListener,
        unhandledRejection: NodeJS.UnhandledRejectionListener,
    };
    private _shutdownHandlers: ShutdownHandler[];
    private _logger: PinoLogger;

    constructor(logger: PinoLogger) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof logger, "object");

        this._logger = logger.child("GracefulShutdownManager");

        this._shutdownHandlers = [];

        this._handleEvents = {
            SIGBREAK: this._handleSignalEvent.bind(this),
            SIGHUP: this._handleSignalEvent.bind(this),
            SIGINT: this._handleSignalEvent.bind(this),
            SIGQUIT: this._handleSignalEvent.bind(this),
            SIGTERM: this._handleSignalEvent.bind(this),
            beforeExit: this._handleBeforeExitEvent.bind(this),
            exit: this._handleExitEvent.bind(this),
            uncaughtException: this._handleUncaughtExceptionEvent.bind(this),
            unhandledRejection: this._handleUnhandledRejectionEvent.bind(this),
        };

        this._shutdownPromise = new Promise((resolve, reject) => {
            const waitForShutdown = () => {
                resolve();
            };

            this.register(waitForShutdown);
        })
            .then(() => {
                this._logger.warn("Detected shutdown.", "_shutdownPromise");

                return undefined;
            });
    }

    public async start() {
        assert.hasLength(arguments, 0);

        process.on("SIGBREAK", this._handleEvents.SIGBREAK);
        process.on("SIGHUP", this._handleEvents.SIGHUP);
        process.on("SIGINT", this._handleEvents.SIGINT);
        process.on("SIGQUIT", this._handleEvents.SIGQUIT);
        process.on("SIGTERM", this._handleEvents.SIGTERM);
        process.on("beforeExit", this._handleEvents.beforeExit);
        process.on("exit", this._handleEvents.exit);
        process.on("uncaughtException", this._handleEvents.uncaughtException);
        process.on("unhandledRejection", this._handleEvents.unhandledRejection);
    }

    public async stop() {
        assert.hasLength(arguments, 0);

        process.removeListener("SIGBREAK", this._handleEvents.SIGBREAK);
        process.removeListener("SIGHUP", this._handleEvents.SIGHUP);
        process.removeListener("SIGINT", this._handleEvents.SIGINT);
        process.removeListener("SIGQUIT", this._handleEvents.SIGQUIT);
        process.removeListener("SIGTERM", this._handleEvents.SIGTERM);
        process.removeListener("beforeExit", this._handleEvents.beforeExit);
        process.removeListener("exit", this._handleEvents.exit);
        process.removeListener("uncaughtException", this._handleEvents.uncaughtException);
        process.removeListener("unhandledRejection", this._handleEvents.unhandledRejection);
    }

    public async register(shutdownHandler: ShutdownHandler) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof shutdownHandler, "function");

        this._shutdownHandlers.push(shutdownHandler);
    }

    public async shutdown() {
        assert.hasLength(arguments, 0);

        return Bluebird.map(
            this._shutdownHandlers,
            (shutdownHandler) => Promise.resolve(shutdownHandler())
                .then(() => undefined, (error) => {
                    this._logger.warn(error, `Masking error in shutdownHandler ${shutdownHandler.name}`);

                    return undefined;
                }),
        );
    }

    public async waitForShutdownSignal() {
        assert.hasLength(arguments, 0);

        return this._shutdownPromise;
    }

    private async _handleBeforeExitEvent(code: number): Promise<void> {
        return this._handleEvent("beforeExit", code);
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
