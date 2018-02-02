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
import IConnection from "../iconnection";

export default abstract class PubSubManager extends ConnectionManager {
    public _topics: string[];
    public _userAccessTokenProvider: any;
    constructor(logger: PinoLogger, connection: IConnection, userAccessTokenProvider, topics: string[]) {
        super(logger, connection);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof userAccessTokenProvider, "function");
        assert.array(topics);
        assert.greater(topics.length, 0);

        this._logger = logger.child("PubSubManager");
        this._userAccessTokenProvider = userAccessTokenProvider;
        this._topics = topics;
    }

    public async start() {
        assert.hasLength(arguments, 0);

        const twitchUserAccessToken = await this._userAccessTokenProvider();
        await super.start(twitchUserAccessToken, this._topics);
    }

    protected abstract async _dataHandler(topic: string, data: object): Promise<void>;
    protected abstract async _filter(topic: string, data: object): Promise<boolean>;
}
