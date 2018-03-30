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

import IZeroMqTopicMessages from "./izeromq-topic-message";
import TopicsSubscriber from "./topics-subscriber";

export default class IntersectionTopicsSubscriber<T> extends TopicsSubscriber<T> {
    private topicsStringSeparator: string;

    constructor(logger: PinoLogger, address: string, ...topics: string[]) {
        super(logger, address, ...topics);

        // NOTE: variable arguments length.
        assert.equal(typeof logger, "object");
        assert.equal(typeof address, "string");
        assert(address.length > 0);
        assert(address.startsWith("tcp://"));
        assert.array(topics);

        // TODO: configurable.
        this.topicsStringSeparator = ":";
        this.logger = logger.child(`IntersectionTopicsSubscriber (${this.topics.join(this.topicsStringSeparator)})`);
    }

    protected async filterMessages(topicMessages: IZeroMqTopicMessages): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof topicMessages, "object");
        assert.nonEmptyArray(topicMessages.messages);
        assert.equal(typeof topicMessages.topic, "string");
        assert.nonEmptyString(topicMessages.topic);

        const currentTopics = topicMessages.topic.split(this.topicsStringSeparator);

        const allMatch = this.topics.every((topic) => currentTopics.includes(topic));

        // this.logger.trace(this.topics, currentTopics, allMatch, "filterMessages");

        return allMatch;
    }

    protected async parseMessages(topicMessages: IZeroMqTopicMessages): Promise<T> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof topicMessages, "object");
        assert.nonEmptyArray(topicMessages.messages);
        assert.hasLength(topicMessages.messages, 1);

        const jsonMessage: T = JSON.parse(topicMessages.messages[0].toString());

        return jsonMessage;
    }
}
