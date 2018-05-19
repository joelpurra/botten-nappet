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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";

import IIncomingPubSubEvent from "@botten-nappet/interface-backend-twitch/src/event/iincoming-pub-sub-event";
import IPubSubResponse from "@botten-nappet/interface-backend-twitch/src/event/ipubsub-response";

import PubSubConnection from "../../pubsub/connection/pubsub-connection";
import PubSubManager from "../../pubsub/connection/pubsub-manager";

@asrt(3)
export default class IncomingPubSubEventTranslator extends PubSubManager {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: PubSubConnection,
        @asrt() private incomingPubSubEventEmitter: IEventEmitter<IIncomingPubSubEvent>,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IPubSubResponse,
    ): Promise<void> {
        this.incomingPubSubEventEmitter.emit(data);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IPubSubResponse,
    ): Promise<boolean> {
        return true;
    }
}
