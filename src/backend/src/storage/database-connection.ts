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

import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import {
    connect,
} from "camo";

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

interface ICamoDatabaseConnection {
    // TODO: update and/or patch @types/camo.
    close: () => void;
}

export default class DatabaseConnection {
    public autocompactionInterval: number;
    private database: ICamoDatabaseConnection | null;
    private uri: string;
    private logger: PinoLogger;

    constructor(logger: PinoLogger, uri: string) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof uri, "string");
        assert(uri.length > 0);
        assert(uri.startsWith("nedb://"));

        this.logger = logger.child("DatabaseConnection");
        this.uri = uri;

        this.database = null;

        // NOTE: non-even minute/second interval, just because I feel like it.
        this.autocompactionInterval = 63912;
    }

    public async connect() {
        assert.hasLength(arguments, 0);
        assert.equal(this.database, null);

        const db = await connect(this.uri);
        this.database = db as ICamoDatabaseConnection;

        return undefined;
    }

    public async disconnect() {
        assert.hasLength(arguments, 0);
        assert.not.equal(this.database, null);

        // NOTE: hack to reach NeDB through Camo.
        const collections = this.database._collections;

        const dbs = Object.values(collections);

        // NOTE: flush data to disk.
        // https://github.com/louischatriot/nedb#persistence
        // NOTE: could be done on a timer, but it's unclear when the database/collection has been loaded by camo.
        /* tslint:disable max-line-length */
        // https://github.com/scottwrobinson/camo/blob/3acde553b37ec7d2161a20424fa1975243f96179/lib/clients/nedbclient.js#L335-L337
        /* tslint:enable max-line-length */
        await Bluebird.map(dbs, (db) => new Promise((resolve, reject) => {
            // NOTE: can't seem to find any error event.
            db.once("compaction.done", () => resolve());

            try {
                db.persistence.compactDatafile();
            } catch (error) {
                reject(error);
            }
        }))
            .tap(() => {
                this.logger.info("database written to disk", "disconnect");
            })
            .tapCatch((error) => {
                this.logger.error(error, "disconnect");
            });

        return this.database!.close();
    }
}
