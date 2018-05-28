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
import {
    autoinject,
} from "aurelia-framework";
import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import {
    connect,
} from "camo";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";
import DatabaseConfig from "../config/database-config";
import ICamoDatabaseConnection from "./icamo-database-connection";

@asrt(2)
@autoinject
export default class DatabaseConnection {
    public autocompactionInterval: number;
    private database: ICamoDatabaseConnection | null;
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly databaseConfig: DatabaseConfig,
    ) {
        this.logger = logger.child(this.constructor.name);

        this.database = null;

        // NOTE: non-even minute/second interval, just because I feel like it.
        this.autocompactionInterval = 63912;
    }

    @asrt(0)
    public async connect() {
        assert.equal(this.database, null);

        const db = await connect(this.databaseConfig.databaseUri);
        this.database = db as ICamoDatabaseConnection;

        return undefined;
    }

    @asrt(0)
    public async disconnect() {
        assert.not.equal(this.database, null);

        // NOTE: hack to reach NeDB through Camo.
        // TODO: better null handling.
        const collections = this.database!._collections;

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
