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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";
import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";

import TwitchUserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";
import IIncomingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/iincoming-irc-command";
import IOutgoingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-irc-command";

@asrt(4)
export default class GreetingIrcHandler extends EventSubscriptionManager<IIncomingIrcCommand> {
    private greetings: RegExp[];

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IIncomingIrcCommand>,
        @asrt() private readonly outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
        @asrt() private readonly twitchUserNameProvider: TwitchUserNameProvider,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);

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

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IIncomingIrcCommand,
    ): Promise<void> {
        this.logger.trace("Responding to greeting.", data.data.username, data.data.message, "dataHandler");

        const userIsASubscriber = data.data.tags!.subscriber === "1";

        // TODO: use a string templating system.
        // TODO: configure response.
        let response = null;

        if (userIsASubscriber) {
            response = `Hiya @${data.data.username}, loyal rubber ducky, how are you?`;
        } else {
            response = `Hiya @${data.data.username}, how are you?`;
        }

        const command: IOutgoingIrcCommand = {
            channel: data.data.channel,
            command: "PRIVMSG",
            message: response,
            tags: {},
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IIncomingIrcCommand,
    ): Promise<boolean> {
        if (data.data.command !== "PRIVMSG") {
            return false;
        }

        if (typeof data.data.message !== "string") {
            return false;
        }

        if (data.data.username === await this.twitchUserNameProvider.get()) {
            return false;
        }

        const tokenizedMessage = data.data.message
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
