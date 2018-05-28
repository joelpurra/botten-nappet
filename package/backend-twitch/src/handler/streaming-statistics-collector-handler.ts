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

import moment from "moment";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";
import MultiEventSubscriptionManager from "@botten-nappet/shared/src/event/multi-event-subscription-manager";

import IIncomingStreamingEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-streaming-event";

import IIncomingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/iincoming-irc-command";
import IOutgoingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-irc-command";

@asrt(3)
export default class StreamingStatisticsCollectorHandler
    extends MultiEventSubscriptionManager<IIncomingStreamingEvent | IIncomingIrcCommand> {
    private commandName: string;
    private commandPrefix: string;
    private currentData: IIncomingStreamingEvent | null;
    private oldData: IIncomingStreamingEvent | null;
    private previousDataLimit: number;
    private previousData: IIncomingStreamingEvent[];
    private outputInterval: number;
    private collectionCount: number;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connections: Array<IEventSubscriptionConnection<IIncomingStreamingEvent | IIncomingIrcCommand>>,
        @asrt() private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
    ) {
        super(logger, connections);

        this.logger = logger.child(this.constructor.name);

        this.commandPrefix = "!";
        this.commandName = "live";

        // NOTE: expecting to collect data from a single channel event source, but not verifying that the
        // channel doesn't change over time and/or per command.
        // TODO: keep "statistics"/state in a separate class?
        this.currentData = null;
        this.oldData = null;
        this.previousDataLimit = 1000;
        this.previousData = [];
        this.outputInterval = 25;
        this.collectionCount = 0;
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IIncomingStreamingEvent | IIncomingIrcCommand,
    ): Promise<void> {
        this.logger.trace(data, "dataHandler");

        let emitResponse = false;

        if (this.isIIncomingStreamingEvent(data)) {
            this.previousData = [data].concat(this.previousData).slice(0, this.previousDataLimit);

            this.collectionCount++;

            if ((this.collectionCount % this.outputInterval) === 0) {
                emitResponse = true;
            }
        }

        if (this.isIIncomingIrcCommand(data)) {
            emitResponse = true;
        }

        if (!emitResponse) {
            return;
        }

        this.oldData = this.currentData;
        this.currentData = this.previousData[0];

        let channelName: string | null = null;
        let response: string | null = null;

        if (!this.currentData) {
            if (this.isIIncomingIrcCommand(data)) {
                channelName = data.channel;

                /* tslint:disable max-line-length */
                response = "Hmm. What? Not sure if I'm live or not! Let's wait another minute for some fresh data 😀";
                /* tslint:enable max-line-length */
            }
        } else {
            channelName = `#${this.currentData.channel.name}`;

            let viewersDiff = 0;

            if (this.oldData) {
                viewersDiff = this.currentData.viewers - this.oldData.viewers;
            }

            const diffSign = viewersDiff >= 0 ? "up" : "down";
            const diffMood = viewersDiff >= 1 ? "😀" : "😐";

            switch (this.currentData.type) {
                case "live":
                    const startedAt = moment(this.currentData.startedAt);
                    const relativeTime = startedAt.fromNow(true);

                    /* tslint:disable max-line-length */
                    response = `Live for ${relativeTime} currently with ${this.currentData.viewers} viewers, ${diffSign} by ${Math.abs(viewersDiff)} ${diffMood}`;
                    /* tslint:enable max-line-length */
                    break;

                case "vodcast":
                    response = `Broadcasting a rerun for ${this.currentData.viewers} viewers 😀`;
                    break;

                case "":
                    // NOTE: unclear if this state will be reached.
                    response = `Stream is currently offline. Follow to catch the next live stream 😀`;
                    break;
            }
        }

        if (!response) {
            this.logger.warn(data, "Unknown stream type, skipping.");

            return;
        }

        if (!channelName) {
            this.logger.warn(data, "Unknown channel name, skipping.");

            return;
        }

        const command: IOutgoingIrcCommand = {
            channel: channelName,
            command: "PRIVMSG",
            message: response,
            tags: {},
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IIncomingStreamingEvent | IIncomingIrcCommand,
    ): Promise<boolean> {
        if (this.isIIncomingStreamingEvent(data)) {
            return true;
        }

        if (this.isIIncomingIrcCommand(data)) {
            if (data.command !== "PRIVMSG") {
                return false;
            }

            if (typeof data.message !== "string") {
                return false;
            }

            if (!data.message.startsWith(this.commandPrefix)) {
                return false;
            }

            // TODO: simplify tokenizer for single command.
            const tokenizedMessageParts = data.message
                .toLowerCase()
                .split(/[^a-z]+/)
                .map((tokenizedPart) => tokenizedPart.trim())
                .filter((tokenizedPart) => tokenizedPart.length > 0);

            const incomingCommand = tokenizedMessageParts[0];
            const isKnownCommand = incomingCommand === this.commandName;

            return isKnownCommand;
        }

        return false;
    }

    private isIIncomingIrcCommand(
        data: any,
    ): data is IIncomingIrcCommand {
        const isMatch = (
            data
            && typeof data.original === "string"
        );

        return isMatch;
    }

    private isIIncomingStreamingEvent(
        data: any,
    ): data is IIncomingStreamingEvent {
        const isMatch = (
            data
            && data.channel
            && typeof data.channel === "object"
            && typeof data.channel.name === "string"
            && typeof data.channel.id === "number"
            && typeof data.title === "string"
            && typeof data.type === "string"
            && typeof data.viewers === "number"
            && typeof data.startedAt === "string"
        );

        return isMatch;
    }
}
