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
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";
import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";

import IIncomingWhisperEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-whisper-event";

import IOutgoingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-irc-command";

@asrt(4)
export default class WhisperIrcReplyHandler extends EventSubscriptionManager<IIncomingWhisperEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IIncomingWhisperEvent>,
        @asrt() private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
        @asrt() private readonly channelName: string,
    ) {
        super(logger, connection);

        assert.nonEmptyString(channelName);
        assert(channelName.startsWith("#"));

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IIncomingWhisperEvent,
    ): Promise<void> {
        // NOTE: hide sender/recipient.
        const username = "anonymous";

        this.logger.trace("Responding to follower.", username, "dataHandler");

        // TODO: use a string templating system.
        // TODO: configure response.
        let response = null;

        if (data.data.type === "received") {
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

    @asrt(1)
    protected async filter(
        @asrt() data: IIncomingWhisperEvent,
    ): Promise<boolean> {
        return true;
    }
}
