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

import Publisher from "@botten-nappet/shared/src/message-queue/publisher";
import TopicPublisher from "@botten-nappet/shared/src/message-queue/topic-publisher";

/* tslint:disable max-line-length */

import I`'___TOPIC_NAME_PASCAL_CASE___() from "@botten-nappet/interface-`'___SECTION_NAME_LOWER_CASE___()-`'___GROUP_NAME_LOWER_CASE___()/src/event/i`'___TOPIC_NAME_PARAM_CASE___()";
import `'___TOPIC_NAME_PASCAL_CASE___()Topic from "../topic/`'___TOPIC_NAME_PARAM_CASE___()-topic";

/* tslint:enable max-line-length */

@asrt(3)
@autoinject
export default class `'___TOPIC_NAME_PASCAL_CASE___()TopicPublisher
    extends TopicPublisher<I`'___TOPIC_NAME_PASCAL_CASE___()> {

    // NOTE: this file is auto-generated. Changes will be overwritten.
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() publisher: Publisher,
        @asrt() topicConfig: `'___TOPIC_NAME_PASCAL_CASE___()Topic,
    ) {
        super(logger, publisher, topicConfig);
    }
}
