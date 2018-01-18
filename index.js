const Promise = require("bluebird");

const ShutdownManager = require("./src/util/shutdown-manager");
const TwitchPubSubConnection = require("./src/twitch/pubsub-connection");
const TwitchPubSubManager = require("./src/twitch/pubsub-manager");

// TODO: better token/config handling.
const twitchWebSocketUri = "wss://pubsub-edge.twitch.tv/";
const twitchAppAccessToken = process.env["TWITCH_APP_ACCESS_TOKEN"];
const twitchUserAccessToken = process.env["TWITCH_USER_ACCESS_TOKEN"];
const twitchChannelId = 148460096;

const shutdownManager = new ShutdownManager();
const twitchPubSubConnection = new TwitchPubSubConnection(twitchWebSocketUri);
const twitchPubSubManager = new TwitchPubSubManager(twitchPubSubConnection, twitchChannelId, twitchUserAccessToken);

Promise.resolve().then(() => shutdownManager.start()).then(() => twitchPubSubConnection.connect()).then(() => {
	const disconnect = (incomingError) => twitchPubSubConnection.disconnect().then(() => {
		if (incomingError) {
			console.error("Disconnected.", incomingError);
		} else {
			console.log("Disconnected.");
		}

		return undefined;
	});

	return Promise.resolve().then(() => twitchPubSubManager.start()).then(() => {
		console.log("Started.");

		const stop = (incomingError) => twitchPubSubManager.stop().then(() => {
			if (incomingError) {
				console.error("Stopped.", incomingError);
			} else {
				console.log("Stopped.");
			}

			return undefined;
		});

		 return shutdownManager.waitForShutdownSignal().then(() => stop(), (error) => stop(error));
	}).then(() => disconnect(), (error) => disconnect(error))
}).then(() => shutdownManager.stop()).then(() => {
	process.exitCode = 0;
}, (error) => {
	console.log("Error.", error);

	process.exitCode = 1;
});
