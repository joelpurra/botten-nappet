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

import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import IPubSubResponse from "../../pubsub/ipubsub-response";
import PubSubConnection from "../../pubsub/pubsub-connection";
import PubSubManager from "../../pubsub/pubsub-manager";
import IIncomingPubSubEvent from "../event/iincoming-pubsub-event";

export default class IncomingPubSubEventTranslator extends PubSubManager {
    private incomingPubSubEventEmitter: IEventEmitter<IIncomingPubSubEvent>;

    constructor(
        logger: PinoLogger,
        connection: PubSubConnection,
        incomingPubSubEventEmitter: IEventEmitter<IIncomingPubSubEvent>,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingPubSubEventEmitter, "object");

        this.logger = logger.child("IncomingPubSubEventTranslator");
        this.incomingPubSubEventEmitter = incomingPubSubEventEmitter;
    }

    protected async dataHandler(data: IPubSubResponse): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.incomingPubSubEventEmitter.emit(data);
    }

    protected async filter(data: IPubSubResponse): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        return true;
    }
}
