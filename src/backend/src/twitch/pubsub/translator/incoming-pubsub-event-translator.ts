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

import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";

import PubSubConnection from "../../pubsub/connection/pubsub-connection";
import PubSubManager from "../../pubsub/connection/pubsub-manager";
import IIncomingPubSubEvent from "../../pubsub/interface/iincoming-pubsub-event";
import IPubSubResponse from "../../pubsub/interface/ipubsub-response";

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

        this.logger = logger.child(this.constructor.name);
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
