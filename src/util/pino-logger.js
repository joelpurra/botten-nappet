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

// const Promise = require("bluebird");

const pino = require("pino");

export default class PinoLogger {
    constructor(name, level) {
        assert.strictEqual(arguments.length, 2);
        assert.strictEqual(typeof name, "string");
        assert(name.length > 0);
        assert.strictEqual(typeof level, "string");
        assert(level.length > 0);

        this._name = name;
        this._level = level;

        this._loggingMethods = [
            "fatal",
            "error",
            "warn",
            "info",
            "debug",
            "trace",
        ];

        this._loggingLevels = [
            "silent",
        ].concat(this._loggingMethods);

        assert(this._loggingLevels.includes(this._level));

        this._pino = pino({
            name: this._name,
            level: this._level,
        });

        this._loggingMethods.forEach(
            (loggingMethod) => {
                this[loggingMethod] = (...args) => this._pino[loggingMethod](...args);
            }
        );
    }
}
