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
    autoinject,
} from "aurelia-framework";
import Bluebird from "bluebird";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import Config from "@botten-nappet/backend-shared/src/config/config";
import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/src/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/src/message-queue/single-item-topics-subscriber";
import MessageQueueTopicHelper from "@botten-nappet/shared/src/message-queue/topics-splitter";

import IOutgoingSearchCommand from "@botten-nappet/interface-vidy/src/command/ioutgoing-search-command";

import VidyApi from "./api";

/* tslint:enable:max-line-length */

@autoinject
export default class BackendVidyApplicationApi implements IStartableStoppable {
    private vidyApi: VidyApi | null;
    private logger: any;
    private connectables: IConnectable[];

    constructor(
        private readonly config: Config,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private readonly messageQueueTopicHelper: MessageQueueTopicHelper,
    ) {
        this.logger = logger.child(this.constructor.name);

        this.vidyApi = null;
        this.connectables = [];
    }

    public async start(): Promise<void> {
        const vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand =
            new MessageQueueSingleItemJsonTopicsSubscriber<IOutgoingSearchCommand>(
                this.logger,
                this.config.zmqAddress,
                await this.messageQueueTopicHelper.split(this.config.topicVidyOutgoingSearchCommand),
            );

        this.connectables.push(vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        this.vidyApi = new VidyApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
        );

        await this.vidyApi.start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.vidyApi) {
            this.vidyApi.stop();
        }

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
