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
        assert.strictEqual(arguments.length, 0);

        this._shutdownHandlers = [];

        this._handleEvent = this._handleEvent.bind(this);

        this._shutdownEvents = ["beforeExit", "SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"];

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
        assert.strictEqual(arguments.length, 0);

        return Promise.try(() => {
            this._shutdownEvents.forEach((shutdownEvent) => {
                process.on(shutdownEvent, this._handleEvent);
            });
        });
    }

    stop() {
        assert.strictEqual(arguments.length, 0);

        return Promise.try(() => {
            this._shutdownEvents.forEach((shutdownEvent) => {
                process.removeListener(shutdownEvent, this._handleEvent);
            });
        });
    }

    register(shutdownHandler) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof shutdownHandler, "function");

        return Promise.try(() => {
            this._shutdownHandlers.push(shutdownHandler);
        });
    }

    shutdown() {
        assert.strictEqual(arguments.length, 0);

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
        assert.strictEqual(arguments.length, 0);

        return this._shutdownPromise;
    }

    _handleEvent(shutdownEvent) {
        // TODO: test/ensure that the right number of arguments are passed from each event/signal type.
        //assert.strictEqual(arguments.length, 1);

        return Promise.try(() => {
            /* eslint-disable no-console */
            console.log(`Received shutdown event: ${JSON.stringify(shutdownEvent, null, 2)}`);
            /* eslint-enable no-console */

            this.shutdown();
        });
    }
}
