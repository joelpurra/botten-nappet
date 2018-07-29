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

import AggregateConnectablesManager from "@botten-nappet/shared/src/connection/aggregate-connectables-manager";
import ConnectablesManager from "@botten-nappet/shared/src/connection/connectables-manager";
import StartablesManager from "@botten-nappet/shared/src/startable-stoppable/startables-manager";

import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import OutgoingSearchCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/vidy-outgoing-search-command-single-item-json-topics-subscriber";
import VidyApi from "@botten-nappet/server-vidy/src/application/api";

/* tslint:enable:max-line-length */

@asrt(4)
@autoinject
export default class BackendVidyApplicationApi extends StartablesManager {
    protected readonly logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly gracefulShutdownManager: GracefulShutdownManager,
        @asrt() private readonly vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
            OutgoingSearchCommandSingleItemJsonTopicsSubscriber,
        @asrt() private readonly vidyApi: VidyApi,
    ) {
        super();

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async loadStartables(): Promise<void> {
        const connectablesManager = new ConnectablesManager(
            this.logger,
            new AggregateConnectablesManager(
                this.logger,
                [
                    this.vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand],
            ),
        );

        this.startables.push(connectablesManager);
        this.startables.push(this.vidyApi);
    }

    @asrt(0)
    public async managedStart(): Promise<void> {
        await this.gracefulShutdownManager.waitForShutdownSignal();
    }

    @asrt(0)
    public async managedStop(): Promise<void> {
        // NOTE: empty.
    }
}
