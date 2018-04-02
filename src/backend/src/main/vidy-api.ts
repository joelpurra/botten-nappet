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

import VidyAuthenticatedRequest from "@botten-nappet/backend-vidy/request/authenticated-request";
import VidyOutgoingSearchCommandHandler from "@botten-nappet/backend-vidy/translator/outgoing-search-command-handler";
import VidyIIncomingSearchResultEvent from "@botten-nappet/interface-vidy/command/iincoming-search-result-event";
import VidyIOutgoingSearchCommand from "@botten-nappet/interface-vidy/command/ioutgoing-search-command";

/* tslint:enable max-line-length */

export default class BackendVidyApi implements IStartableStoppable {
    private startables: IStartableStoppable[];
    private messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<VidyIOutgoingSearchCommand>;
    private messageQueuePublisher: MessageQueuePublisher;
    private gracefulShutdownManager: GracefulShutdownManager;
    private logger: PinoLogger;
    private config: Config;

    constructor(
        config: Config,
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        messageQueuePublisher: MessageQueuePublisher,
        messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
            MessageQueueSingleItemJsonTopicsSubscriber<VidyIOutgoingSearchCommand>,
    ) {
        // TODO: validate arguments.
        this.config = config;
        this.logger = logger.child("BackendVidyApi");
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.messageQueuePublisher = messageQueuePublisher;
        this.messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand
            = messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand;

        this.startables = [];
    }

    public async start(): Promise<void> {
        const messageQueueTopicPublisherForIIncomingSearchResultEvent =
            new MessageQueueTopicPublisher<VidyIIncomingSearchResultEvent>(
                this.logger,
                this.messageQueuePublisher,
                this.config.topicVidyIncomingSearchResultEvent,
            );

        const vidyAuthenticatedRequest = new VidyAuthenticatedRequest(this.logger, this.config);

        const vidyOutgoingSearchCommandHandler = new VidyOutgoingSearchCommandHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
            messageQueueTopicPublisherForIIncomingSearchResultEvent,
            vidyAuthenticatedRequest,
            this.config.vidyRootUrl,
        );

        this.startables.push(vidyOutgoingSearchCommandHandler);

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
                vidyKeyId: this.config.vidyKeyId,
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
