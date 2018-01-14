const assert = require("assert");
const Promise = require("bluebird");

const WebSocket = require("ws");

module.exports = class TwitchConnection {
	constructor(uri) {
		this.uri = uri;

		this.ws = null;
		this.connected = false;
	}

	connect() {
		assert(!this.connected);

		return new Promise((resolve, reject) => {
			const onOpen = () => {
				const data = {
					type: "PING"
				};
				const message = JSON.stringify(data);

				this.ws.send(message);
			}

			const onError = (e) => {
				this.disconnect();

				unregisterListeners();
			}

			const onClose = () => {
				this.connected = false;

				unregisterListeners();

				this.ws = null;

			}

			const onMessage = (message) => {
				// TODO: try-catch for bad messages.
				const data = JSON.parse(message);

				if (data.type === "PONG") {
					this.connected = true;
					resolve();
				}

				unregisterListeners();
			}

			const registerListeners = () => {
				this.ws.once("open", onOpen);
				this.ws.once("error", onError);
				this.ws.once("close", onClose);
				this.ws.once("message", onMessage);
			}

			const unregisterListeners = () => {
				this.ws.removeListener("open", onOpen);
				this.ws.removeListener("error", onError);
				this.ws.removeListener("message", onMessage);
			}

			this.ws = new WebSocket(this.uri);

			registerListeners();
		});
	}

	disconnect() {
		assert(this.connected);

		return new Promise.try(() => {
			// TODO: ensure the connection was closed.
			this.ws.close();
		});
	}

	listen(userAccessToken, topics, dataHandler) {
		assert(this.connected);

		return new Promise((resolve, reject) => {
			const onMessage = (message) => {
				console.log("onMessage", message);

				// TODO: try-catch for bad messages.
				const data = JSON.parse(message);

				if (data.type !== "MESSAGE") {
					return;
				}

				if (!topics.includes(data.data.topic)) {
					return;
				}

				const messageData = JSON.parse(data.data.message);

				// TODO: try-catch for bad handlers.
				dataHandler(data.data.topic, messageData);
			};

			const onListen = (message) => {
				console.log("onListen", message);

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

				this.ws.removeListener("message", onListen);
				this.ws.on("message", onMessage);

				const killSwitch = () => {
					this.ws.removeListener("message", onMessage);
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

			this.ws.on("message", onListen);

			this.ws.send(message);
		});
	}
}
