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

export default class PinoLogger {
    constructor(parentPinoLogger) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof parentPinoLogger, "object");

        this._parentPinoLogger = parentPinoLogger;

        this._loggingMethods = [
            "fatal",
            "error",
            "warn",
            "info",
            "debug",
            "trace",
        ];

        this._loggingMethods.forEach(
            (loggingMethod) => {
                this[loggingMethod] = (...args) => {
                    this._parentPinoLogger[loggingMethod]({
                        // TODO: serialize error objects etcetera.
                        // args: this._serialize(args),
                        args: args,
                    });

                    // TODO: configure to flush only during development/debugging.
                    this._parentPinoLogger.flush();
                };
            }
        );
    }

    child(childName) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof childName, "string");
        assert(childName.length > 0);

        const childBindings = {
            childName: childName,
        };

        const pinoLogger = this._parentPinoLogger.child(childBindings);

        const childLogger = new PinoLogger(pinoLogger);

        return childLogger;
    }

    // _valueReplacer(/* eslint-disable no-unused-vars */key/* eslint-enable no-unused-vars */, value) {
    //     if (value !== null && typeof value === "object" && value.stack) {
    //         return value.toString();
    //     }
    //
    //     return value;
    // }
    //
    // _serialize(value) {
    //     // TODO: serialize error objects etcetera.
    //     return JSON.stringify(value, this._valueReplacer.bind(this), 2);
    // }
}
