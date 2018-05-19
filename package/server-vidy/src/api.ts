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
import {
    assert,
} from "check-types";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";
import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import VidyAuthenticatedRequest from "@botten-nappet/backend-vidy/src/request/authenticated-request";
import VidyOutgoingSearchCommandHandler from "@botten-nappet/backend-vidy/src/translator/outgoing-search-command-handler";
import IncomingSearchResultEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-search-result-event-topic-publisher";
import OutgoingSearchCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/outgoing-search-command-single-item-json-topics-subscriber";

/* tslint:enable max-line-length */

@autoinject
export default class BackendVidyApi implements IStartableStoppable {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        private readonly backendConfig: BackendConfig,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
            OutgoingSearchCommandSingleItemJsonTopicsSubscriber,
        private readonly messageQueueTopicPublisherForIIncomingSearchResultEvent:
            IncomingSearchResultEventTopicPublisher,
        private readonly vidyAuthenticatedRequest: VidyAuthenticatedRequest,
    ) {
        assert.hasLength(arguments, 6);
        assert.equal(typeof backendConfig, "object");
        assert.equal(typeof logger, "object");
        assert.equal(typeof gracefulShutdownManager, "object");
        assert.equal(typeof messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand, "object");
        assert.equal(typeof messageQueueTopicPublisherForIIncomingSearchResultEvent, "object");
        assert.equal(typeof vidyAuthenticatedRequest, "object");

        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    public async start(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.hasLength(this.startables, 0);

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
        assert.hasLength(arguments, 0);

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
