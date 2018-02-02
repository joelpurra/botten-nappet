/*
This file is part of botten-nappet -- a Twitch bot and streaming tool.
<https://joelpurra.com/projects/botten-nappet/>

Copyright (c) 2018 Joel Purra <https://joelpurra.com/>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import IrcManager from "../irc-manager";

const assert = require("power-assert");

export default class FollowReminderIrcHandler extends IrcManager {
    constructor(logger, connection) {
        super(logger, connection);

        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof connection, "object");

        this._logger = logger.child("FollowReminderIrcHandler");
        this._reminderIntervalId = null;

        this._reminderIntervalMilliseconds = 15 * 60 * 1000;
        this._reminderMessages = [
            "Remember to follow to catch the next live stream 😀",
            "Enjoying the stream? Hit that follow button! 😀",
            "I know not everyone wants to be a follower, but keep in mind that followers receive super-handy notifications when a live stream starts 😀",
            "Want to ask a question but haven't prepared it yet? Follow and then ask it the next live stream 😀",
            // NOTE: per-restart calculation of the random value. Re-calculate per reminder?
            `Did you know followers are up to ${(50 + (Math.random() * 50)).toString().substring(0, 5)}% more likely to not miss the next live stream? 😀`,
        ];
    }

    async start() {
        assert.strictEqual(arguments.length, 0);
        assert.strictEqual(this._reminderIntervalId, null);

        await super.start();

        this._reminderIntervalId = setInterval(() => this._remind(), this._reminderIntervalMilliseconds);
    }

    async stop() {
        assert.strictEqual(arguments.length, 0);
        assert.notStrictEqual(this._reminderIntervalId, null);

        clearInterval(this._reminderIntervalId);
        this._reminderIntervalId = null;

        return super.stop();
    }

    _getReminder() {
        assert.strictEqual(arguments.length, 0);

        // TODO: get library for random integers.
        const randomReminderMessageIndex = Math.floor(Math.random() * this._reminderMessages.length);

        const randomReminderMessage = this._reminderMessages[randomReminderMessageIndex];

        return randomReminderMessage;
    }

    _remind() {
        assert.strictEqual(arguments.length, 0);

        this._logger.trace("Sending reminder", "_remind");

        // TODO: use a string templating system.
        // TODO: configure message.
        const reminder = this._getReminder();

        const message = `PRIVMSG ${this._connection._channel} :${reminder}`;

        // TODO: handle errors, re-reconnect, or shut down server?
        this._connection._send(message);
    }

    async _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        throw new Error("Unexpected call to _dataHandler.");
    }

    async _filter(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        return false;
    }
}
