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

import PinoLogger from "../util/pino-logger";

import TopicConfig from "@botten-nappet/shared/src/config/topic-config";
import TopicHelper from "@botten-nappet/shared/src/message-queue/topics-splitter";
import ZmqConfig from "../config/zmq-config";
import IZeroMqTopicMessages from "./izeromq-topic-message";
import TopicsSubscriber from "./topics-subscriber";

@asrt(4)
export default abstract class IntersectionTopicsSubscriber<T> extends TopicsSubscriber<T> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() topicHelper: TopicHelper,
        @asrt() zmqConfig: ZmqConfig,
        @asrt() topicConfig: TopicConfig,
    ) {
        super(logger, topicHelper, zmqConfig, topicConfig);

        this.logger = logger.child(`${this.constructor.name} (${this.topicConfig.topic})`);
    }

    @asrt(1)
    protected async filterMessages(
        @asrt() topicMessages: IZeroMqTopicMessages
    ): Promise<boolean> {
        const currentTopics = await this.topicHelper.split(topicMessages.topic);

        // TODO: better null handling.
        const allMatch = this.topics!.every((topic) => currentTopics.includes(topic));

        // this.logger.trace(this.topics, currentTopics, allMatch, "filterMessages");

        return allMatch;
    }
}
