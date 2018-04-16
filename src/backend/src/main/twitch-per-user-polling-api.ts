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
import MessageQueueTopicPublisher from "@botten-nappet/shared/message-queue/topic-publisher";

import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/interface/response/polling/icheermotes-polling-response";
import IPollingFollowingResponse from "@botten-nappet/backend-twitch/interface/response/polling/ifollowing-polling-response";
import IPollingStreamingResponse from "@botten-nappet/backend-twitch/interface/response/polling/istreaming-polling-response";
import PollingClientIdConnection from "@botten-nappet/backend-twitch/polling/connection/polling-clientid-connection";

import IncomingCheermotesCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-cheermotes-event-translator";
import IncomingFollowingCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-following-event-translator";
import IncomingStreamingCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-streaming-event-translator";

import IIncomingCheermotesEvent from "@botten-nappet/interface-twitch/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "@botten-nappet/interface-twitch/event/iincoming-following-event";
import IIncomingStreamingEvent from "@botten-nappet/interface-twitch/event/iincoming-streaming-event";

/* tslint:enable max-line-length */

export default class TwitchPerUserPollingApi {
    private startables: IStartableStoppable[];
    private twitchUserId: number;
    private twitchPollingCheermotesConnection: PollingClientIdConnection<IPollingCheermotesResponse>;
    private twitchPollingStreamingConnection: PollingClientIdConnection<IPollingStreamingResponse>;
    private twitchPollingFollowingConnection: PollingClientIdConnection<IPollingFollowingResponse>;
    private messageQueuePublisher: MessageQueuePublisher;
    private gracefulShutdownManager: GracefulShutdownManager;
    private logger: PinoLogger;
    private config: Config;

    constructor(
        config: Config,
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        messageQueuePublisher: MessageQueuePublisher,
        twitchPollingFollowingConnection: PollingClientIdConnection<IPollingFollowingResponse>,
        twitchPollingStreamingConnection: PollingClientIdConnection<IPollingStreamingResponse>,
        twitchPollingCheermotesConnection: PollingClientIdConnection<IPollingCheermotesResponse>,
        twitchUserId: number,
    ) {
        // TODO: validate arguments.
        this.config = config;
        this.logger = logger.child(this.constructor.name);
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.messageQueuePublisher = messageQueuePublisher;
        this.twitchPollingFollowingConnection = twitchPollingFollowingConnection;
        this.twitchPollingStreamingConnection = twitchPollingStreamingConnection;
        this.twitchPollingCheermotesConnection = twitchPollingCheermotesConnection;
        this.twitchUserId = twitchUserId;

        this.startables = [];
    }

    public async start(): Promise<void> {
        const messageQueueTopicPublisherForIIncomingFollowingEvent =
            new MessageQueueTopicPublisher<IIncomingFollowingEvent>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchIncomingFollowingEvent,
            );

        const messageQueueTopicPublisherForIIncomingStreamingEvent =
            new MessageQueueTopicPublisher<IIncomingStreamingEvent>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchIncomingStreamingEvent,
            );

        const messageQueueTopicPublisherForIIncomingCheermotesEvent =
            new MessageQueueTopicPublisher<IIncomingCheermotesEvent>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicTwitchIncomingCheermotesEvent,
            );

        const twitchIncomingFollowingCommandEventTranslator = new IncomingFollowingCommandEventTranslator(
            this.logger,
            this.twitchPollingFollowingConnection,
            messageQueueTopicPublisherForIIncomingFollowingEvent,
            this.config.twitchUserName,
            this.twitchUserId,
        );

        const twitchIncomingStreamingCommandEventTranslator = new IncomingStreamingCommandEventTranslator(
            this.logger,
            this.twitchPollingStreamingConnection,
            messageQueueTopicPublisherForIIncomingStreamingEvent,
            this.config.twitchUserName,
            this.twitchUserId,
        );

        const twitchIncomingCheermotesCommandEventTranslator = new IncomingCheermotesCommandEventTranslator(
            this.logger,
            this.twitchPollingCheermotesConnection,
            messageQueueTopicPublisherForIIncomingCheermotesEvent,
            this.config.twitchUserName,
            this.twitchUserId,
        );

        this.startables.push(twitchIncomingFollowingCommandEventTranslator);
        this.startables.push(twitchIncomingStreamingCommandEventTranslator);
        this.startables.push(twitchIncomingCheermotesCommandEventTranslator);

        const stop = async (incomingError?: Error) => {
            await this.stop();

            if (incomingError) {
                this.logger.error(incomingError, "Stopped.");

                throw incomingError;
            }

            this.logger.info("Stopped.");

            return undefined;
        };

        try {
            await Bluebird.map(this.startables, async (startable) => startable.start());

            this.logger.info({
                twitchUserId: this.twitchUserId,
                twitchUserName: this.config.twitchUserName,
            }, "Started listening to events");

            await this.gracefulShutdownManager.waitForShutdownSignal();

            await stop();
        } catch (error) {
            await stop(error);
        }
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
