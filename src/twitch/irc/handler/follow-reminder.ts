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

import ConnectionManager from "../../../connection/connection-manager";
import IEventEmitter from "../../../event/ievent-emitter";
import IEventSubscriptionConnection from "../../../event/ievent-subscription-connection";
import PinoLogger from "../../../util/pino-logger";
import IIncomingIrcCommand from "../command/iincoming-irc-command";
import IOutgoingIrcCommand from "../command/ioutgoing-irc-command";

export default class FollowReminderIrcHandler extends ConnectionManager<IIncomingIrcCommand> {
    private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>;
    private reminderMessages: string[];
    private reminderIntervalMilliseconds: number;
    private reminderIntervalId: (number | NodeJS.Timer | null);
    private channelName: string;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingIrcCommand>,
        outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
        channelName: string,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof outgoingIrcCommandEventEmitter, "object");
        assert.equal(typeof channelName, "string");
        assert.greater(channelName.length, 0);

        this.logger = logger.child("FollowReminderIrcHandler");
        this.outgoingIrcCommandEventEmitter = outgoingIrcCommandEventEmitter;
        this.channelName = channelName;

        this.reminderIntervalId = null;

        this.reminderIntervalMilliseconds = 15 * 60 * 1000;

        /* tslint:disable:max-line-length */
        this.reminderMessages = [
            "Remember to follow to catch the next live stream 😀",
            "Enjoying the stream? Hit that follow button! 😀",
            "I know not everyone wants to be a follower, but keep in mind that followers receive super-handy notifications when a live stream starts 😀",
            "Want to ask a question but haven't prepared it yet? Follow and then ask it the next live stream 😀",

            // NOTE: per-restart calculation of the random value. Re-calculate per reminder?
            `Did you know followers are up to ${(50 + (Math.random() * 50)).toString().substring(0, 5)}% more likely to not miss the next live stream? 😀`,
        ];
        /* tslint:enable:max-line-length */
    }

    public async start() {
        assert.hasLength(arguments, 0);
        assert.equal(this.reminderIntervalId, null);

        await super.start();

        // TODO: use an observable interval?
        this.reminderIntervalId = setInterval(() => this.remind(), this.reminderIntervalMilliseconds);
    }

    public async stop() {
        assert.hasLength(arguments, 0);
        assert.not.equal(this.reminderIntervalId, null);

        clearInterval(this.reminderIntervalId as NodeJS.Timer);
        this.reminderIntervalId = null;

        return super.stop();
    }

    protected async dataHandler(data: IIncomingIrcCommand): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        throw new Error("Unexpected call to dataHandler.");
    }

    protected async filter(data: IIncomingIrcCommand): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        return false;
    }

    private getReminder() {
        assert.hasLength(arguments, 0);

        // TODO: get library for random integers.
        const randomReminderMessageIndex = Math.floor(Math.random() * this.reminderMessages.length);

        const randomReminderMessage = this.reminderMessages[randomReminderMessageIndex];

        return randomReminderMessage;
    }

    private remind() {
        assert.hasLength(arguments, 0);

        this.logger.trace("Sending reminder", "remind");

        // TODO: use a string templating system.
        // TODO: configure response.
        const response = this.getReminder();

        const command: IOutgoingIrcCommand = {
            channel: this.channelName,
            command: "PRIVMSG",
            message: response,
            tags: {},
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }
}
