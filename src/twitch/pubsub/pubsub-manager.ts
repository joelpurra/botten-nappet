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

import PinoLogger from "../../util/pino-logger";
import ConnectionManager from "../connection-manager";
import IPubSubConnection from "./ipubsub-connection";
import IPubSubResponse from "./ipubsub-response";

export default abstract class PubSubManager extends ConnectionManager<IPubSubResponse, string> {
    constructor(logger: PinoLogger, connection: IPubSubConnection) {
        super(logger, connection);

        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this.logger = logger.child("PubSubManager");
    }

    protected abstract async dataHandler(data: IPubSubResponse): Promise<void>;
    protected abstract async filter(data: IPubSubResponse): Promise<boolean>;
}
