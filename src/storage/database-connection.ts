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

import {
    connect,
} from "camo";
import PinoLogger from "../util/pino-logger";

interface ICamoDatabaseConnection {
    // TODO: update and/or patch @types/camo.
    close: () => void;
}

export default class DatabaseConnection {
    public _database: ICamoDatabaseConnection | null;
    public _uri: string;
    public _logger: PinoLogger;

    constructor(logger: PinoLogger, uri: string) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof uri, "string");
        assert(uri.length > 0);
        assert(uri.startsWith("nedb://"));

        this._logger = logger.child("DatabaseConnection");
        this._uri = uri;

        this._database = null;
    }

    public async connect() {
        assert.hasLength(arguments, 0);
        assert.equal(this._database, null);

        const db = await connect(this._uri);
        this._database = db as ICamoDatabaseConnection;

        return undefined;
    }

    public async disconnect() {
        assert.hasLength(arguments, 0);
        assert.not.equal(this._database, null);

        return this._database!.close();
    }
}
