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

import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";
import IDistributedEvent from "@botten-nappet/server-backend/src/storage/interface/idistributed-event";
import DistributedEventStorageManager from "@botten-nappet/server-backend/src/storage/manager/distributed-event-storage-manager";

@asrt(3)
export default abstract class DistributedEventManager extends EventSubscriptionManager<IDistributedEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IDistributedEvent>,
        @asrt() private readonly distributedEventStorageManager: DistributedEventStorageManager,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IDistributedEvent,
    ): Promise<void> {
        // this.logger.trace(data, "dataHandler");

        this.distributedEventStorageManager.store(data);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IDistributedEvent,
    ): Promise<boolean> {
        return true;
    }
}
