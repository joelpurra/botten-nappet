const assert = require("assert");
const Promise = require("bluebird");

const WebSocket = require("ws");

module.exports = class PubSubConnection {
	constructor(uri) {
		this._uri = uri;

		this._ws = null;
		this._connected = false;
	}

	connect() {
		assert(!this._connected);

		return new Promise((resolve, reject) => {
			const onOpen = () => {
				const data = {
					type: "PING"
				};
				const message = JSON.stringify(data);

				this._ws.send(message);
			}

			const onError = (e) => {
				this.disconnect();

				unregisterListeners();
			}

			const onClose = () => {
				this._connected = false;

				unregisterListeners();

				this._ws = null;

			}

			const onMessage = (message) => {
				// TODO: try-catch for bad messages.
				const data = JSON.parse(message);

				if (data.type === "PONG") {
					this._connected = true;
					resolve();
				}

				unregisterListeners();
			}

			const registerListeners = () => {
				this._ws.once("open", onOpen);
				this._ws.once("error", onError);
				this._ws.once("close", onClose);
				this._ws.once("message", onMessage);
			}

			const unregisterListeners = () => {
				this._ws.removeListener("open", onOpen);
				this._ws.removeListener("error", onError);
				this._ws.removeListener("message", onMessage);
			}

			this._ws = new WebSocket(this._uri);

			registerListeners();
		});
	}

	disconnect() {
		assert(this._connected);

		return new Promise.try(() => {
			// TODO: ensure the connection was closed.
			this._ws.close();
		});
	}

	listen(userAccessToken, topics, dataHandler) {
		assert(this._connected);

		return new Promise((resolve, reject) => {
			const onMessage = (message) => {
				// TODO: try-catch for bad messages.
				const data = JSON.parse(message);

				if (data.type !== "MESSAGE") {
					return;
				}

				if (!topics.includes(data.data.topic)) {
					return;
				}
				w

				const messageData = JSON.parse(data.data.message);

				// TODO: try-catch for bad handlers.
				dataHandler(data.data.topic, messageData);
			};

			const onListen = (message) => {
				// TODO: try-catch for bad messages.
				const data = JSON.parse(message);

				if (data.nonce !== nonce) {
					// NOTE: skip non-matching messages; they are presumably for other handlers.
					return;
				}

				if (typeof data.error === "string" && data.error.length !== 0) {
					reject(new Error(`Listen error: ${JSON.stringify(data.error)}`));
				}

				if (data.type !== "RESPONSE") {
					reject(new Error(`Bad type: ${JSON.stringify(data.type)}`));
				}

				this._ws.removeListener("message", onListen);
				this._ws.on("message", onMessage);

				const killSwitch = () => {
					this._ws.removeListener("message", onMessage);
				};

				resolve(killSwitch);
			};

			const nonce = Math.random().toString(10);

			const data = {
				type: "LISTEN",
				nonce: nonce,
				data: {
					topics: topics,
					auth_token: userAccessToken
				}
			};
			const message = JSON.stringify(data);

			this._ws.on("message", onListen);

			this._ws.send(message);
		});
	}
}
