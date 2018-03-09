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

import PinoLogger from "../../../shared/src/util/pino-logger";

import IntersectionTopicsSubscriber from "./intersection-topics-subscriber";
import IZeroMqTopicMessages from "./izeromq-topic-message";

export default class ItemArrayJsonTopicsSubscriber<T> extends IntersectionTopicsSubscriber<T[]> {
    constructor(logger: PinoLogger, address: string, ...topics: string[]) {
        super(logger, address, ...topics);

        // NOTE: variable arguments length.
        assert.equal(typeof logger, "object");
        assert.equal(typeof address, "string");
        assert(address.length > 0);
        assert(address.startsWith("tcp://"));
        assert.array(topics);

        // TODO: configurable.
        const topicsStringSeparator = ":";

        this.logger = logger.child(`ItemArrayJsonTopicsSubscriber (${this.topics.join(topicsStringSeparator)})`);
    }

    protected async parseMessages(topicMessages: IZeroMqTopicMessages): Promise<T[]> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof topicMessages, "object");
        assert.nonEmptyArray(topicMessages.messages);

        const jsonMessages = topicMessages.messages.map((msg) => JSON.parse(msg.toString()));

        return jsonMessages;
    }
}
