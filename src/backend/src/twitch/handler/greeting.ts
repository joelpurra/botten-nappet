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

import IIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/iincoming-irc-command";
import IOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";

export default class GreetingIrcHandler extends EventSubscriptionManager<IIncomingIrcCommand> {
    private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>;
    private greetings: RegExp[];
    private username: string;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingIrcCommand>,
        outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
        username: string,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof outgoingIrcCommandEventEmitter, "object");
        assert.equal(typeof username, "string");
        assert.greater(username.length, 0);

        this.logger = logger.child("GreetingIrcHandler");
        this.outgoingIrcCommandEventEmitter = outgoingIrcCommandEventEmitter;
        this.username = username;

        this.greetings = [
            /\bh(e+|a+)llo\b/,
            /\bhi+\b/,
            /\bhiya\b/,
            /\bhe+y\b/,
            /\bhowdy\b/,
            /\baloha\b/,
            /\b(o )?hai\b/,
            /\bgood (morning|evening|day)\b/,
            /\bwhat ?s up\b/,
            /\bwh?a+z+(u+p+)?\b/,
            /\byo+\b/,
            /\bay+\b/,

            // NOTE: emoticons.
            /\bheyguys\b/,
            /\bvohiyo\b/,
            /\bkoncha\b/,
        ];
    }

    protected async dataHandler(data: IIncomingIrcCommand): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.logger.trace("Responding to greeting.", data.username, data.message, "dataHandler");

        const userIsASubscriber = data.tags!.subscriber === "1";

        // TODO: use a string templating system.
        // TODO: configure response.
        let response = null;

        if (userIsASubscriber) {
            response = `Hiya @${data.username}, loyal rubber ducky, how are you?`;
        } else {
            response = `Hiya @${data.username}, how are you?`;
        }

        const command: IOutgoingIrcCommand = {
            channel: data.channel,
            command: "PRIVMSG",
            message: response,
            tags: {},
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    protected async filter(data: IIncomingIrcCommand): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (data.command !== "PRIVMSG") {
            return false;
        }

        if (typeof data.message !== "string") {
            return false;
        }

        if (data.username === this.username) {
            return false;
        }

        const tokenizedMessage = data.message
            .toLowerCase()
            .split(/[^a-z]+/)
            .map((tokenizedPart) => tokenizedPart.trim())
            .filter((tokenizedPart) => tokenizedPart.length > 0)
            .join(" ")
            .trim();

        const isGreeting = this.greetings.some((greeting) => {
            return greeting.test(tokenizedMessage);
        });

        return isGreeting;
    }
}
