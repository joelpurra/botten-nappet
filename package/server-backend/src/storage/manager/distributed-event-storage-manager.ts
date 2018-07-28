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
import {
    assert,
} from "check-types";

import IDistributedEvent from "@botten-nappet/server-backend/src/storage/interface/idistributed-event";
import DistributedEventRepositoryClass from "@botten-nappet/server-backend/src/storage/repository/distributed-event-repository";
import IDistributedEventSchema from "@botten-nappet/server-backend/src/storage/repository/idistributed-event-schema";

@asrt(0)
@autoinject
export default class DistributedEventStorageManager {
    private readonly DistributedEventRepository: typeof DistributedEventRepositoryClass;

    constructor() {
        // TODO: use injectable type?
        this.DistributedEventRepository = DistributedEventRepositoryClass;
    }

    @asrt(1)
    public async getByDistributedEventTopic(
        @asrt() topic: string,
    ): Promise<IDistributedEvent[]> {
        assert.nonEmptyString(topic);

        const findDistributedEvent = {
            topic,
        };

        const distributedEvents =
            await this.DistributedEventRepository
                .find<IDistributedEventSchema>(findDistributedEvent);

        // this.logger.trace(distributedEvents, "getByDistributedEventTopic");

        return distributedEvents as IDistributedEvent[];
    }

    @asrt(1)
    public async store(
        @asrt() distributedEvent: IDistributedEvent,
    ): Promise<void> {
        assert.nonEmptyString(distributedEvent.topic);

        const distributedEventAfterStoring = await this.DistributedEventRepository.create(distributedEvent);

        // this.logger.trace(distributedEventAfterStoring, "store");

        await distributedEventAfterStoring.save();
    }
}
