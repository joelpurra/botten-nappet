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

const assert = require("assert");
const Promise = require("bluebird");

export default class IrcManager {
    constructor(logger, ircConnection) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof ircConnection, "object");

        this._logger = logger;
        this._ircConnection = ircConnection;

        this._killSwitch = null;
    }

    start() {
        assert.strictEqual(arguments.length, 0);

        return this._ircConnection.listen(this._dataHandler.bind(this), this._filter.bind(this))
            .then((killSwitch) => {
                this._killSwitch = killSwitch;

                return undefined;
            })
            .tapCatch(() => this._executeKillSwitch());
    }

    stop() {
        assert.strictEqual(arguments.length, 0);

        // TODO: assert killSwitch?
        return Promise.try(() => {
            if (typeof this._killSwitch === "function") {
                this._executeKillSwitch();
            }
        });
    }

    _dataHandler(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        this._logger.debug("_dataHandler", JSON.stringify(data, null, 2));
    }

    _filter(data) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof data, "object");

        // TODO: add a real filter.
        return Promise.resolve(true);
    }

    _executeKillSwitch() {
        assert.strictEqual(arguments.length, 0);

        return Promise.try(() => {
            if (typeof this._killSwitch !== "function") {
                return;
            }

            const killSwitch = this._killSwitch;
            this._killSwitch = null;
            killSwitch();
        });
    }
}
