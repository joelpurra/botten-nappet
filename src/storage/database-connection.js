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

const assert = require("power-assert");

const connect = require("camo").connect;

export default class DatabaseConnection {
    constructor(logger, uri) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof uri, "string");
        assert(uri.length > 0);
        assert(uri.startsWith("nedb://"));

        this._logger = logger.child("DatabaseConnection");
        this._uri = uri;

        this._database = null;
    }

    async connect() {
        assert.strictEqual(arguments.length, 0);
        assert.strictEqual(this._database, null);

        const db = await connect(this._uri);
        this._database = db;

        return undefined;
    }

    async disconnect() {
        assert.strictEqual(arguments.length, 0);
        assert.notStrictEqual(this._database, null);

        return this._database.close();
    }
}
