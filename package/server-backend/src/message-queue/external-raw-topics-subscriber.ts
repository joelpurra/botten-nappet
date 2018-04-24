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
    inject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IDistributedEvent from "@botten-nappet/backend-shared/src/storage/idistributed-event";
import ZmqConfig from "@botten-nappet/shared/src/config/zmq-config";
import RawTopicsSubscriber from "@botten-nappet/shared/src/message-queue/raw-topics-subscriber";

@inject(PinoLogger, ZmqConfig)
export default class ExternalRawTopicsSubscriber extends RawTopicsSubscriber {
    constructor(
        logger: PinoLogger,
        zmqConfig: ZmqConfig,
    ) {
        super(logger, zmqConfig, [
            // NOTE: single-purpose class: supply the "configuration" value.
            "external",
        ]);

        // NOTE: not checking arguments length due to inheritance.
        assert.equal(typeof logger, "object");
        assert.equal(typeof zmqConfig, "object");

        assert.equal(typeof zmqConfig.zmqAddress, "string");
        assert(zmqConfig.zmqAddress.length > 0);
        assert(zmqConfig.zmqAddress.startsWith("tcp://"));

        this.logger = logger.child(`${this.constructor.name} (${this.topics.join(this.topicsStringSeparator)})`);
    }
}
