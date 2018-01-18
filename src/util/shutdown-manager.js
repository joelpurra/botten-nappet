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
