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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import ExternalRawTopic from "@botten-nappet/server-backend/src/message-queue/external-raw-topic";
import ZmqConfig from "@botten-nappet/shared/src/config/zmq-config";
import RawTopicsSubscriber from "@botten-nappet/shared/src/message-queue/raw-topics-subscriber";
import TopicHelper from "@botten-nappet/shared/src/message-queue/topics-splitter";

@asrt(4)
@autoinject
export default class ExternalRawTopicsSubscriber extends RawTopicsSubscriber {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() topicHelper: TopicHelper,
        @asrt() zmqConfig: ZmqConfig,
        @asrt() topicConfig: ExternalRawTopic,
    ) {
        super(logger, topicHelper, zmqConfig, topicConfig);

        this.logger = logger.child(`${this.constructor.name} (${this.topicConfig.topic})`);
    }
}
