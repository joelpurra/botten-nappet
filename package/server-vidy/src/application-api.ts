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

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import OutgoingSearchCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/vidy-outgoing-search-command-single-item-json-topics-subscriber";
import VidyApi from "./api";

/* tslint:enable:max-line-length */

@asrt(3)
@autoinject
export default class BackendVidyApplicationApi implements IStartableStoppable {
    private logger: any;
    private connectables: IConnectable[] = [];

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
            OutgoingSearchCommandSingleItemJsonTopicsSubscriber,
        @asrt() private readonly vidyApi: VidyApi,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async start(): Promise<void> {
        assert.hasLength(this.connectables, 0);

        this.connectables.push(this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        await this.vidyApi.start();

        this.logger.info("Started.");
    }

    @asrt(0)
    public async stop(): Promise<void> {
        this.logger.info("Stopping.");

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
