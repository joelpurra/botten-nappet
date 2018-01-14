const WebSocket = require('ws');

// TODO: better token/config handling.
var authToken = process.env['TWITCH_CLIENT_ACCESS_TOKEN'];

const ws = new WebSocket('wss://pubsub-edge.twitch.tv/');

ws.on('open', function open() {
	console.log('connected');

	const data = {
		type: "PING"
	};
	const message = JSON.stringify(data);

	ws.send(message);
});

ws.on('close', function close() {
	console.log('disconnected');
});

ws.on('message', function incoming(message) {
	const data = JSON.parse(message);

	console.log(`Message: ${JSON.stringify(data, null, 2)}`);

	process.exit();
});
