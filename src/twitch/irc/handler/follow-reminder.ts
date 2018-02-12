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

import {
    assert,
} from "check-types";

import PinoLogger from "../../../util/pino-logger";
import IIRCConnection from "../iirc-connection";
import IParsedMessage from "../iparsed-message";
import IrcManager from "../irc-manager";

export default class FollowReminderIrcHandler extends IrcManager {
    public _reminderMessages: string[];
    public _reminderIntervalMilliseconds: number;
    public _reminderIntervalId: (number | NodeJS.Timer | null);

    constructor(logger: PinoLogger, connection: IIRCConnection) {
        super(logger, connection);

        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

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

    public async start() {
        assert.hasLength(arguments, 0);
        assert.equal(this._reminderIntervalId, null);

        await super.start();

        // TODO: use an observable interval?
        this._reminderIntervalId = setInterval(() => this._remind(), this._reminderIntervalMilliseconds);
    }

    public async stop() {
        assert.hasLength(arguments, 0);
        assert.not.equal(this._reminderIntervalId, null);

        clearInterval(this._reminderIntervalId as NodeJS.Timer);
        this._reminderIntervalId = null;

        return super.stop();
    }

    public _getReminder() {
        assert.hasLength(arguments, 0);

        // TODO: get library for random integers.
        const randomReminderMessageIndex = Math.floor(Math.random() * this._reminderMessages.length);

        const randomReminderMessage = this._reminderMessages[randomReminderMessageIndex];

        return randomReminderMessage;
    }

    public _remind() {
        assert.hasLength(arguments, 0);

        this._logger.trace("Sending reminder", "_remind");

        // TODO: use a string templating system.
        // TODO: configure message.
        const reminder = this._getReminder();

        const message = `PRIVMSG ${this._connection.channel} :${reminder}`;

        // TODO: handle errors, re-reconnect, or shut down server?
        this._connection.send(message);
    }

    public async _dataHandler(data: IParsedMessage): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        throw new Error("Unexpected call to _dataHandler.");
    }

    public async _filter(data: IParsedMessage): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        return false;
    }
}
