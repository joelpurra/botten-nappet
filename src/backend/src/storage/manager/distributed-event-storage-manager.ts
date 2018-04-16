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
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import IDistributedEvent from "../idistributed-event";
import DistributedEventRepositoryClass from "../repository/distributed-event-repository";

export default class DistributedEventStorageManager {
    private DistributedEventRepository: typeof DistributedEventRepositoryClass;
    private logger: PinoLogger;

    constructor(logger: PinoLogger, DistributedEventRepository: typeof DistributedEventRepositoryClass) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof DistributedEventRepository, "function");

        this.logger = logger.child(this.constructor.name);
        this.DistributedEventRepository = DistributedEventRepository;
    }

    public async getByDistributedEventTopic(topic: string): Promise<IDistributedEvent[]> {
        assert.hasLength(arguments, 1);
        assert.nonEmptyString(topic);

        const findDistributedEvent = {
            topic,
        };

        const distributedEvents = await this.DistributedEventRepository.find(findDistributedEvent);

        // this.logger.trace(distributedEvents, "getByDistributedEventTopic");

        return distributedEvents;
    }

    public async store(distributedEvent: IDistributedEvent) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof distributedEvent, "object");
        assert.nonEmptyString(distributedEvent.topic);

        const distributedEventAfterStoring = await this.DistributedEventRepository.create(distributedEvent);

        // this.logger.trace(distributedEventAfterStoring, "store");

        return distributedEventAfterStoring.save();
    }
}
