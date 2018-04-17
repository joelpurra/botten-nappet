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

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueTopicPublisher from "@botten-nappet/shared/message-queue/topic-publisher";

/* tslint:disable max-line-length */
import IIncomingPubSubEvent from "@botten-nappet/backend-twitch/pubsub/interface/iincoming-pubsub-event";
import IncomingPubSubEventTranslator from "@botten-nappet/backend-twitch/pubsub/translator/incoming-pubsub-event-translator";
/* tslint:enable max-line-length */

import PubSubConnection from "@botten-nappet/backend-twitch/pubsub/connection/pubsub-connection";
import PubSubLoggingHandler from "@botten-nappet/backend-twitch/pubsub/handler/logging";
import PubSubPingHandler from "@botten-nappet/backend-twitch/pubsub/handler/ping";
import PubSubReconnectHandler from "@botten-nappet/backend-twitch/pubsub/handler/reconnect";

export default class TwitchPerUserPubSubApi {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        private readonly config: Config,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private readonly twitchAllPubSubTopicsForTwitchUserIdConnection: PubSubConnection,
        private readonly twitchUserId: number,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    public async start(): Promise<void> {
        const twitchPubSubPingHandler = new PubSubPingHandler(
            this.logger,
            this.twitchAllPubSubTopicsForTwitchUserIdConnection,
        );
        const twitchPubSubReconnectHandler = new PubSubReconnectHandler(
            this.logger,
            this.twitchAllPubSubTopicsForTwitchUserIdConnection,
        );
        const twitchPubSubLoggingHandler = new PubSubLoggingHandler(
            this.logger,
            this.twitchAllPubSubTopicsForTwitchUserIdConnection,
        );

        const messageQueueTopicPublisherForIIncomingPubSubEvent =
            new MessageQueueTopicPublisher<IIncomingPubSubEvent>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchIncomingPubSubEvent,
            );

        const twitchIncomingPubSubEventTranslator = new IncomingPubSubEventTranslator(
            this.logger,
            this.twitchAllPubSubTopicsForTwitchUserIdConnection,
            messageQueueTopicPublisherForIIncomingPubSubEvent,
        );

        this.startables.push(twitchPubSubPingHandler);
        this.startables.push(twitchPubSubReconnectHandler);
        this.startables.push(twitchPubSubLoggingHandler);
        this.startables.push(twitchIncomingPubSubEventTranslator);

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