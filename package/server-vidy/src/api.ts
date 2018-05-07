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

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";
import SharedTopicsConfig from "@botten-nappet/shared/src/config/shared-topics-config";
import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/src/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/src/message-queue/single-item-topics-subscriber";
import MessageQueueTopicPublisher from "@botten-nappet/shared/src/message-queue/topic-publisher";

import VidyAuthenticatedRequest from "@botten-nappet/backend-vidy/src/request/authenticated-request";
import VidyOutgoingSearchCommandHandler from "@botten-nappet/backend-vidy/src/translator/outgoing-search-command-handler";
import VidyIIncomingSearchResultEvent from "@botten-nappet/interface-shared-vidy/src/event/iincoming-search-result-event";
import VidyIOutgoingSearchCommand from "@botten-nappet/interface-shared-vidy/src/event/ioutgoing-search-command";
import IncomingSearchResultEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-search-result-event-topic-publisher";
import OutgoingSearchCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/outgoing-search-command-single-item-json-topics-subscriber";

/* tslint:enable max-line-length */

@autoinject
export default class BackendVidyApi implements IStartableStoppable {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        private readonly backendConfig: BackendConfig,
        private readonly sharedTopicsConfig: SharedTopicsConfig,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
            OutgoingSearchCommandSingleItemJsonTopicsSubscriber,
        private readonly messageQueueTopicPublisherForIIncomingSearchResultEvent:
            IncomingSearchResultEventTopicPublisher,
        private readonly vidyAuthenticatedRequest: VidyAuthenticatedRequest,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    public async start(): Promise<void> {
        const vidyOutgoingSearchCommandHandler = new VidyOutgoingSearchCommandHandler(
            this.logger,
            this.messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
            this.messageQueueTopicPublisherForIIncomingSearchResultEvent,
            this.vidyAuthenticatedRequest,
            this.backendConfig.vidyRootUrl,
        );

        this.startables.push(vidyOutgoingSearchCommandHandler);

        await Bluebird.map(this.startables, async (startable) => startable.start());

        this.logger.info({
            vidyKeyId: this.backendConfig.vidyKeyId,
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
