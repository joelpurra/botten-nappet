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

import IPubSubResponse from "@botten-nappet/interface-backend-twitch/src/event/ipubsub-response";

import IPubSubConnection from "@botten-nappet/backend-twitch/src/pubsub/connection/ipubsub-connection";
import PubSubManager from "@botten-nappet/backend-twitch/src/pubsub/connection/pubsub-manager";

@asrt(2)
export default class ReconnectPubSubHandler extends PubSubManager {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IPubSubConnection,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IPubSubResponse,
    ): Promise<void> {
        this.logger.trace(data, "dataHandler");

        this.logger.info("Reconnecting.");

        // TODO: handle errors, re-reconnect, or shut down server?
        this.connection.reconnect();
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IPubSubResponse,
    ): Promise<boolean> {
        if (typeof data.type !== "string") {
            return false;
        }

        // https://dev.twitch.tv/docs/pubsub#connection-management
        if (data.type !== "RECONNECT") {
            return false;
        }

        return true;
    }
}
