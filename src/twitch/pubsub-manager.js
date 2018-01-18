const assert = require("assert");
const Promise = require("bluebird");

export default class PubSubManager {
    constructor(pubSubConnection, userId, userAccessToken) {
        assert.strictEqual(typeof pubSubConnection, "object");
        assert(!isNaN(userId));
        assert(userId > 0);
        assert.strictEqual(typeof userAccessToken, "string");
        assert(userAccessToken.length > 0);

        this._pubSubConnection = pubSubConnection;
        this._userId = userId;
        this._userAccessToken = userAccessToken;

        // TODO: one class per listen-topic, or one class per concern?
        this._topics = [`channel-bits-events-v1.${this._userId}`, `channel-subscribe-events-v1.${this._userId}`, `channel-commerce-events-v1.${this._userId}`, `whispers.${this._userId}`];

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
            if (typeof this._killSwitch !== "function") {
                return;
            }

            const killSwitch = this._killSwitch;
            this._killSwitch = null;
            killSwitch();
        });
    }
}
