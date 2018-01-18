const assert = require("assert");

const Promise = require("bluebird");

module.exports = class ShutdownManager {
	constructor() {
		this._shutdownHandlers = [];

		this._handleSignal = this._handleSignal.bind(this);

		this.signals = ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"];

		this._shutdownPromise = new Promise((resolve, reject) => {
			const waitForShutdown = () => {
				console.warn("Detected shutdown.");

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
		return Promise.map(this._shutdownHandlers, (shutdownHandler) => Promise.resolve(shutdownHandler()).then(() => undefined, (error) => {
			console.warn(`Masking error in shutdownHandler ${shutdownHandler.name}`, error);

			return undefined;
		}));
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
