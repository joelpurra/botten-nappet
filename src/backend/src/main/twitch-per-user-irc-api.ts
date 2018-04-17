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

import Bluebird from "bluebird";

import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

/* tslint:disable max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/message-queue/single-item-topics-subscriber";
import MessageQueueTopicPublisher from "@botten-nappet/shared/message-queue/topic-publisher";

import TwitchIrcConnection from "@botten-nappet/backend-twitch/irc/connection/irc-connection";
import TwitchIrcLoggingHandler from "@botten-nappet/backend-twitch/irc/handler/logging";
import TwitchIrcPingHandler from "@botten-nappet/backend-twitch/irc/handler/ping";
import TwitchIrcReconnectHandler from "@botten-nappet/backend-twitch/irc/handler/reconnect";

import ITwitchIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";
import TwitchIncomingIrcCommandEventTranslator from "@botten-nappet/backend-twitch/irc/translator/incoming-irc-command-event-translator";
import TwitchOutgoingIrcCommandEventHandler from "@botten-nappet/backend-twitch/irc/translator/outgoing-irc-command-event-handler";

/* tslint:enable max-line-length */

export default class TwitchPerUserIrcApi implements IStartableStoppable {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        private config: Config,
        logger: PinoLogger,
        private gracefulShutdownManager: GracefulShutdownManager,
        private messageQueuePublisher: MessageQueuePublisher,
        private twitchIrcConnection: TwitchIrcConnection,
        private twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand:
            MessageQueueSingleItemJsonTopicsSubscriber<ITwitchOutgoingIrcCommand>,
        private twitchUserId: number,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    public async start(): Promise<void> {
        const twitchIrcReconnectHandler = new TwitchIrcReconnectHandler(
            this.logger,
            this.twitchIrcConnection,
        );

        const messageQueueTopicPublisherForIIncomingIrcCommand =
            new MessageQueueTopicPublisher<ITwitchIncomingIrcCommand>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchIncomingIrcCommand,
            );

        const twitchIncomingIrcCommandEventTranslator = new TwitchIncomingIrcCommandEventTranslator(
            this.logger,
            this.twitchIrcConnection,
            messageQueueTopicPublisherForIIncomingIrcCommand,
        );

        const twitchOutgoingIrcCommandEventHandler = new TwitchOutgoingIrcCommandEventHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
            this.twitchIrcConnection,
        );

        const twitchIrcLoggingHandler = new TwitchIrcLoggingHandler(
            this.logger,
            this.twitchIrcConnection,
        );
        const twitchIrcPingHandler = new TwitchIrcPingHandler(
            this.logger,
            this.twitchIrcConnection,
        );

        this.startables.push(twitchIrcReconnectHandler);
        this.startables.push(twitchIrcLoggingHandler);
        this.startables.push(twitchIrcPingHandler);
        this.startables.push(twitchIncomingIrcCommandEventTranslator);
        this.startables.push(twitchOutgoingIrcCommandEventHandler);

        await Bluebird.map(this.startables, async (startable) => startable.start());

        this.logger.info({
            twitchUserId: this.twitchUserId,
            twitchUserName: this.config.twitchUserName,
        }, "Started listening to events");

        await this.gracefulShutdownManager.waitForShutdownSignal();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await Bluebird.map(
            this.startables,
            async (startable) => {
                try {
                    await startable.stop();
                } catch (error) {
                    this.logger.error(error, startable, "Swallowed error while stopping.");
                }
            },
        );
    }
}
