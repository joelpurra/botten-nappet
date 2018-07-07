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
import {
    autoinject,
} from "aurelia-framework";
import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import VidyAuthenticatedRequest from "@botten-nappet/backend-vidy/src/request/authenticated-request";
import VidyOutgoingSearchCommandHandler from "@botten-nappet/backend-vidy/src/translator/outgoing-search-command-handler";
import IncomingSearchResultEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/vidy-incoming-search-result-event-topic-publisher";
import OutgoingSearchCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/vidy-outgoing-search-command-single-item-json-topics-subscriber";

/* tslint:enable max-line-length */

@asrt(5)
@autoinject
export default class BackendVidyApi implements IStartableStoppable {
    private startables: IStartableStoppable[] = [];
    private logger: PinoLogger;

    constructor(
        @asrt() private readonly backendConfig: BackendConfig,
        @asrt() logger: PinoLogger,
        @asrt() private readonly messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
            OutgoingSearchCommandSingleItemJsonTopicsSubscriber,
        @asrt() private readonly messageQueueTopicPublisherForIIncomingSearchResultEvent:
            IncomingSearchResultEventTopicPublisher,
        @asrt() private readonly vidyAuthenticatedRequest: VidyAuthenticatedRequest,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async start(): Promise<void> {
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
    }

    @asrt(0)
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
