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
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import DistributedEventManager from "@botten-nappet/backend-shared/src/distributed-events/distributed-event-manager";
import DistributedEventStorageManager from "@botten-nappet/backend-shared/src/storage/manager/distributed-event-storage-manager";
import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";

/* tslint:enable max-line-length */

import ExternalRawTopicsSubscriber from "../message-queue/external-raw-topics-subscriber";

@autoinject
export default class ExternalDistributedEventManager extends DistributedEventManager {
    constructor(
        logger: PinoLogger,
        connection: ExternalRawTopicsSubscriber,
        distributedEventStorageManager: DistributedEventStorageManager,
    ) {
        super(logger, connection, distributedEventStorageManager);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof distributedEventStorageManager, "object");

        this.logger = logger.child(this.constructor.name);
    }
}
