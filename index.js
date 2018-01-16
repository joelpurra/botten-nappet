const Promise = require("bluebird");

const TwitchPubSubConnection = require("./src/twitch-pubsub-connection");

// TODO: better token/config handling.
const twitchWebSocketUri = "wss://pubsub-edge.twitch.tv/";
const twitchAppAccessToken = process.env["TWITCH_APP_ACCESS_TOKEN"];
const twitchUserAccessToken = process.env["TWITCH_USER_ACCESS_TOKEN"];
const twitchChannelId = 148460096;
const MAX_LISTEN_TIME_MILLISECONDS = 5 * 60 * 1000;

const twitchPubSubConnection = new TwitchPubSubConnection(twitchWebSocketUri);

twitchPubSubConnection.connect().then(() => {
	console.log("Connected.");

	const disconnect = () => twitchPubSubConnection.disconnect().then(() => {
		console.log("Disconnected.");
	});

	return Promise.resolve().then(() => {
		const topics = [`channel-bits-events-v1.${twitchChannelId}`, `channel-subscribe-events-v1.${twitchChannelId}`, `channel-commerce-events-v1.${twitchChannelId}`, `whispers.${twitchChannelId}`];
		const dataHandler = (topic, data) => {
			console.log("dataHandler", topic, JSON.stringify(data, null, 2));
		};

		return twitchPubSubConnection.listen(twitchUserAccessToken, topics, dataHandler).then((killSwitch) => {
			console.log(`Listening for ${MAX_LISTEN_TIME_MILLISECONDS} milliseconds.`);

			return Promise.delay(MAX_LISTEN_TIME_MILLISECONDS).then(() => killSwitch(), () => killSwitch());
		});
	}).then(() => disconnect(), (error) => {
		console.error("Error.", error);

		return disconnect();
	}).then(() => {
		process.exit();
	});
});
