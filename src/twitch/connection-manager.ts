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

import PinoLogger from "../util/pino-logger";
import IConnection from "./iconnection";

export default abstract class ConnectionManager {
    // TODO: make connection private.
    protected _connection: any;
    protected _logger: PinoLogger;
    private _killSwitch: ((() => void) | null);

    constructor(logger: PinoLogger, connection: IConnection) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this._logger = logger.child("ConnectionManager");
        this._connection = connection;

        this._killSwitch = null;
    }

    public async start(...extraListenArguments: any[]) {
        assert(arguments.length === 0 || Array.isArray(extraListenArguments));

        try {
            const killSwitch = await this._connection.listen(
                this._dataHandler.bind(this),
                this._filter.bind(this),
                ...extraListenArguments,
            );

            this._killSwitch = killSwitch;
        } catch (error) {
            await this._executeKillSwitch();

            throw error;
        }
    }

    public async stop() {
        assert.hasLength(arguments, 0);

        // TODO: assert killSwitch?
        if (typeof this._killSwitch === "function") {
            await this._executeKillSwitch();
        }
    }

    protected abstract async _dataHandler(data: any): Promise<void>;
    protected abstract async _filter(data: any): Promise<boolean>;

    private async _executeKillSwitch() {
        assert.hasLength(arguments, 0);

        const killSwitch = this._killSwitch;

        if (killSwitch === null) {
            return;
        }

        this._killSwitch = null;
        await killSwitch();
    }
}
