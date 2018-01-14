const assert = require("assert");
const Promise = require("bluebird");

const WebSocket = require("ws");

module.exports = class TwitchConnection {
	constructor(uri, clientAccessToken) {
		this.uri = uri;
		this.clientAccessToken = clientAccessToken;

		this.ws = null;
		this.connected = false;
	}

	connect() {
		assert(!this.connected);

		return new Promise((resolve, reject) => {
			const onOpen = () => {
				console.log("ws", "connected");

				const data = {
					type: "PING"
				};
				const message = JSON.stringify(data);

				this.ws.send(message);
			}

			const onError = (e) => {
				console.error("ws", "error", e);

				this.disconnect();

				unregisterListeners();
			}

			const onClose = () => {
				this.connected = false;

				unregisterListeners();

				this.ws = null;

				console.log("ws", "disconnected");
			}

			const onMessage = (message) => {
				const data = JSON.parse(message);

				console.log("ws", `Message: ${JSON.stringify(data, null, 2)}`);

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
}
