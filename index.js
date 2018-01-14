const Promise = require("bluebird");

const TwitchConnection = require("./src/twitch-connection");

// TODO: better token/config handling.
const twitchWebSocketUri = "wss://pubsub-edge.twitch.tv/";
const twitchClientAccessToken = process.env["TWITCH_CLIENT_ACCESS_TOKEN"];

const twitchConnection = new TwitchConnection(twitchWebSocketUri, twitchClientAccessToken);

twitchConnection.connect().then(() => {
	console.log("Connected.");
}).then(() => twitchConnection.disconnect().then(() => {
	console.log("Disconnected.");
}));
