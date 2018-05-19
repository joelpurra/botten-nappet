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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IDistributedEvent from "@botten-nappet/backend-shared/src/storage/idistributed-event";
import TopicConfig from "@botten-nappet/shared/src/config/topic-config";
import ZmqConfig from "@botten-nappet/shared/src/config/zmq-config";
import TopicHelper from "@botten-nappet/shared/src/message-queue/topics-splitter";
import IntersectionTopicsSubscriber from "./intersection-topics-subscriber";

export default abstract class RawTopicsSubscriber extends IntersectionTopicsSubscriber<IDistributedEvent> {
    constructor(
        logger: PinoLogger,
        topicHelper: TopicHelper,
        zmqConfig: ZmqConfig,
        topicConfig: TopicConfig,
    ) {
        super(logger, topicHelper, zmqConfig, topicConfig);

        // NOTE: not checking arguments length due to inheritance.
        assert.equal(typeof logger, "object");
        assert.equal(typeof topicHelper, "object");
        assert.equal(typeof zmqConfig, "object");
        assert.equal(typeof topicConfig, "object");

        this.logger = logger.child(`${this.constructor.name} (${this.topicConfig.topic})`);
    }

    protected async parseMessages(topicMessages: IDistributedEvent): Promise<IDistributedEvent> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof topicMessages, "object");
        assert.nonEmptyArray(topicMessages.messages);
        assert.equal(typeof topicMessages.topic, "string");
        assert.nonEmptyString(topicMessages.topic);

        return topicMessages;
    }
}
