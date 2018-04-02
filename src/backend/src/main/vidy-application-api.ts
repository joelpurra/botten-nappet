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

import IConnectable from "@botten-nappet/shared/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

/* tslint:disable:max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/message-queue/single-item-topics-subscriber";

import IOutgoingSearchCommand from "@botten-nappet/interface-vidy/command/ioutgoing-search-command";

import VidyApi from "./vidy-api";

/* tslint:enable:max-line-length */

export default class BackendVidyApplicationApi implements IStartableStoppable {
    private vidyApi: VidyApi | null;
    private messageQueuePublisher: MessageQueuePublisher;
    private gracefulShutdownManager: GracefulShutdownManager;
    private logger: any;
    private config: Config;
    private connectables: IConnectable[];

    constructor(
        config: Config,
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        messageQueuePublisher: MessageQueuePublisher,
    ) {
        this.config = config;
        this.logger = logger.child("BackendVidyApplicationApi");
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.messageQueuePublisher = messageQueuePublisher;

        this.vidyApi = null;
        this.connectables = [];
    }

    public async start(): Promise<void> {
        // TODO: configurable.
        const topicsStringSeparator = ":";
        const splitTopics = (topicsString: string): string[] => topicsString.split(topicsStringSeparator);

        const vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand =
            new MessageQueueSingleItemJsonTopicsSubscriber<IOutgoingSearchCommand>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicVidyOutgoingSearchCommand),
            );

        this.connectables.push(vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        const disconnect = async (incomingError?: Error) => {
            await this.stop();

            if (incomingError) {
                this.logger.error(incomingError, "Disconnected.");

                throw incomingError;
            }

            this.logger.info("Disconnected.");

            return undefined;
        };

        this.vidyApi = new VidyApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
        );

        try {
            await this.vidyApi.start();

            await disconnect();
        } catch (error) {
            await disconnect(error);
        }
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        this.vidyApi!.stop();

        await Bluebird.map(
            this.connectables,
            async (connectable) => {
                try {
                    await connectable.disconnect();
                } catch (error) {
                    this.logger.error(error, connectable, "Swallowed error while disconnecting.");
                }
            },
        );
    }
}
