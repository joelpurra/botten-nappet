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

import ZmqConfig from "@botten-nappet/shared/src/config/zmq-config";

import SingleItemJsonTopicsSubscriber from "@botten-nappet/shared/src/message-queue/single-item-topics-subscriber";

import TopicHelper from "@botten-nappet/shared/src/message-queue/topics-splitter";

/* tslint:disable max-line-length */

import I`'___GROUP_NAME_PASCAL_CASE___()`'___TOPIC_NAME_PASCAL_CASE___() from "@botten-nappet/interface-`'___SECTION_NAME_LOWER_CASE___()`'___INTERFACE_PACKAGE_NAME___()/src/event/i`'___INTERFACE_FILE_NAME___()`'___TOPIC_NAME_PARAM_CASE___()";
import `'___GROUP_NAME_PASCAL_CASE___()`'___TOPIC_NAME_PASCAL_CASE___()Topic from "../topic/`'___GROUP_NAME_PARAM_CASE___()-`'___TOPIC_NAME_PARAM_CASE___()-topic";

/* tslint:enable max-line-length */

@asrt(4)
@autoinject
export default class `'___GROUP_NAME_PASCAL_CASE___()`'___TOPIC_NAME_PASCAL_CASE___()SingleItemJsonTopicsSubscriber
    extends SingleItemJsonTopicsSubscriber<I`'___GROUP_NAME_PASCAL_CASE___()`'___TOPIC_NAME_PASCAL_CASE___()> {

    // NOTE: this file is auto-generated. Changes will be overwritten.
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() topicHelper: TopicHelper,
        @asrt() zmqConfig: ZmqConfig,
        @asrt() topicConfig: `'___GROUP_NAME_PASCAL_CASE___()`'___TOPIC_NAME_PASCAL_CASE___()Topic,
    ) {
        super(logger, topicHelper, zmqConfig, topicConfig);
    }
}
