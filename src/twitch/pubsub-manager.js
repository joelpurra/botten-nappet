const Promise = require("bluebird");

module.exports = class PubSubManager {
	constructor(pubSubConnection, channelId, userAccessToken) {
		this._pubSubConnection = pubSubConnection;
		this._channelId = channelId;
		this._userAccessToken = userAccessToken;

		// TODO: one class per listen-topic, or one class per concern?
		this._topics = [`channel-bits-events-v1.${this._channelId}`, `channel-subscribe-events-v1.${this._channelId}`, `channel-commerce-events-v1.${this._channelId}`, `whispers.${this._channelId}`];

		this._killSwitch = null;
	}

	start() {
		return this._pubSubConnection.listen(this._userAccessToken, this._topics, this._dataHandler.bind(this)).then((killSwitch) => {
			this._killSwitch = killSwitch;
		}).tapCatch(() => this._executeKillSwitch());
	}

	stop() {
		// TODO: assert killSwitch?
		return Promise.try(() => {
			if (typeof this._killSwitch === "function") {
				this._executeKillSwitch();
			}
		});
	}

	_dataHandler(topic, data) {
		console.log("dataHandler", topic, JSON.stringify(data, null, 2));
	}

	_executeKillSwitch() {
		return Promise.try(() => {
			const killSwitch = this._killSwitch;
			this._killSwitch = null;
			killSwitch();
		});
	}
}
