const Promise = require("bluebird");

const TwitchPubSubConnection = require("./src/twitch/pubsub-connection");
const TwitchPubSubManager = require("./src/twitch/pubsub-manager");

// TODO: better token/config handling.
const twitchWebSocketUri = "wss://pubsub-edge.twitch.tv/";
const twitchAppAccessToken = process.env["TWITCH_APP_ACCESS_TOKEN"];
const twitchUserAccessToken = process.env["TWITCH_USER_ACCESS_TOKEN"];
const twitchChannelId = 148460096;
const MAX_LISTEN_TIME_MILLISECONDS = 5 * 1000;

const twitchPubSubConnection = new TwitchPubSubConnection(twitchWebSocketUri);
const twitchPubSubManager = new TwitchPubSubManager(twitchPubSubConnection, twitchChannelId, twitchUserAccessToken);

Promise.resolve().then(() => twitchPubSubConnection.connect()).then(() => {
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

		console.log(`Online for ${MAX_LISTEN_TIME_MILLISECONDS} milliseconds.`);

		// TODO: perform more work here.
		return Promise.delay(MAX_LISTEN_TIME_MILLISECONDS).then(() => stop(), (error) => stop(error));
	}).then(() => disconnect(), (error) => disconnect(error))
}).then(() => {
	process.exit();
}, (error) => {
	console.log("Error.", error);

	process.exit(1);
});
