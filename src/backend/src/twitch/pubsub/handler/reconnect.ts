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
import IPubSubConnection from "../connection/ipubsub-connection";
import PubSubManager from "../connection/pubsub-manager";
import IPubSubResponse from "../interface/ipubsub-response";

export default class ReconnectPubSubHandler extends PubSubManager {
    constructor(logger: PinoLogger, connection: IPubSubConnection) {
        super(logger, connection);

        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this.logger = logger.child("ReconnectPubSubHandler");
    }

    protected async dataHandler(data: IPubSubResponse): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.logger.trace(data, "dataHandler");

        this.logger.info("Reconnecting.");

        // TODO: handle errors, re-reconnect, or shut down server?
        this.connection.reconnect();
    }

    protected async filter(data: IPubSubResponse): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

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
