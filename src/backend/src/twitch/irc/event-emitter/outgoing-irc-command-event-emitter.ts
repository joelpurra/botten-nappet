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

import IEventEmitter from "../../../../../shared/src/event/ievent-emitter";
import TopicPublisher from "../../../../../shared/src/message-queue/topic-publisher";
import PinoLogger from "../../../../../shared/src/util/pino-logger";
import IOutgoingIrcCommand from "../command/ioutgoing-irc-command";

export default class OutgoingIrcCommandEventEmitter implements IEventEmitter<IOutgoingIrcCommand> {
    private logger: PinoLogger;
    private topicPublisher: TopicPublisher<IOutgoingIrcCommand>;

    constructor(logger: PinoLogger, topicPublisher: TopicPublisher<IOutgoingIrcCommand>) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof topicPublisher, "object");

        this.logger = logger.child("OutgoingIrcCommandEventEmitter");
        this.topicPublisher = topicPublisher;
    }

    public async emit(data: IOutgoingIrcCommand): Promise<void> {
        assert.equal(typeof data, "object");
        assert.not.null(data);

        this.logger.trace(data, "emit");

        this.topicPublisher.emit(data);
    }
}
