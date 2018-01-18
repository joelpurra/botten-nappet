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

const assert = require("assert");

const Promise = require("bluebird");

export default class ShutdownManager {
    constructor() {
        this._shutdownHandlers = [];

        this._handleSignal = this._handleSignal.bind(this);

        this.signals = ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"];

        this._shutdownPromise = new Promise((resolve, /* eslint-disable no-unused-vars */reject/* eslint-enable no-unused-vars */) => {
            const waitForShutdown = () => {
                /* eslint-disable no-console */
                console.warn("Detected shutdown.");
                /* eslint-enable no-console */

                resolve();
            };

            this.register(waitForShutdown);
        });
    }

    start() {
        return Promise.try(() => {
            this.signals.forEach((signal) => {
                process.on(signal, this._handleSignal);
            });
        });
    }

    stop() {
        return Promise.try(() => {
            this.signals.forEach((signal) => {
                process.removeListener(signal, this._handleSignal);
            });
        });
    }

    register(shutdownHandler) {
        assert.strictEqual(typeof shutdownHandler, "function");

        return Promise.try(() => {
            this._shutdownHandlers.push(shutdownHandler);
        });
    }

    shutdown() {
        return Promise.map(
            this._shutdownHandlers,
            (shutdownHandler) => Promise.resolve(shutdownHandler())
                .then(() => undefined, (error) => {
                    /* eslint-disable no-console */
                    console.warn(`Masking error in shutdownHandler ${shutdownHandler.name}`, error);
                    /* eslint-enable no-console */

                    return undefined;
                })
        );
    }

    waitForShutdownSignal() {
        return this._shutdownPromise;
    }

    _handleSignal() {
        return Promise.try(() => {
            this.shutdown();
        });
    }
}
