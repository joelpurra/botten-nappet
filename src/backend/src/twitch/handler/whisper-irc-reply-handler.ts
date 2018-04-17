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

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/event/event-subscription-manager";
import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/event/ievent-subscription-connection";

import IIncomingWhisperEvent from "@botten-nappet/interface-twitch/event/iincoming-whisper-event";

import IOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";

export default class WhisperIrcReplyHandler extends EventSubscriptionManager<IIncomingWhisperEvent> {
    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingWhisperEvent>,
        private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
        private readonly channelName: string,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof outgoingIrcCommandEventEmitter, "object");
        assert.nonEmptyString(channelName);
        assert(channelName.startsWith("#"));

        this.logger = logger.child(this.constructor.name);
    }

    protected async dataHandler(data: IIncomingWhisperEvent): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        // NOTE: hide sender/recipient.
        const username = "anonymous";

        this.logger.trace("Responding to follower.", username, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure response.
        let response = null;

        if (data.type === "received") {
            response = `Hey, ${username}, I'll have a look at your whisper soon 😀`;
        } else {
            response = `Hey, ${username}, I just sent a reply whisper 😀`;
        }

        const command: IOutgoingIrcCommand = {
            channel: this.channelName,
            command: "PRIVMSG",
            message: response,
            tags: {},
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    protected async filter(data: IIncomingWhisperEvent): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        return true;
    }
}
