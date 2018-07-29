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

import {
    Logger,
} from "pino";

import {
    assert,
} from "check-types";

import {
    fmtError,
} from "error-shortener";

@asrt(3)
@autoinject
export default class PinoLogger {
    constructor(
        @asrt() private readonly names: string[],
        @asrt() private readonly name: string,
        @asrt() private readonly parentPinoLogger: Logger,
    ) {
        assert.hasLength(arguments, 3);
        assert.array(this.names);
        assert.nonEmptyString(this.name);
        assert.equal(typeof parentPinoLogger, "object");
    }

    public fatal(...args: any[]): void {
        this.parentPinoLogger.fatal({
            args: this.serialize(...args),
        });

        // TODO: configure to flush only during development/debugging.
        this.parentPinoLogger.flush();
    }

    public error(...args: any[]): void {
        this.parentPinoLogger.error({
            args: this.serialize(...args),
        });

        // TODO: configure to flush only during development/debugging.
        this.parentPinoLogger.flush();
    }

    public warn(...args: any[]): void {
        this.parentPinoLogger.warn({
            args: this.serialize(...args),
        });

        // TODO: configure to flush only during development/debugging.
        this.parentPinoLogger.flush();
    }

    public info(...args: any[]): void {
        this.parentPinoLogger.info({
            args: this.serialize(...args),
        });

        // TODO: configure to flush only during development/debugging.
        this.parentPinoLogger.flush();
    }

    public debug(...args: any[]): void {
        this.parentPinoLogger.debug({
            args: this.serialize(...args),
        });

        // TODO: configure to flush only during development/debugging.
        this.parentPinoLogger.flush();
    }

    public trace(...args: any[]): void {
        this.parentPinoLogger.trace({
            args: this.serialize(...args),
        });

        // TODO: configure to flush only during development/debugging.
        this.parentPinoLogger.flush();
    }

    public child(childName: string): PinoLogger {
        assert.hasLength(arguments, 1);
        assert.equal(typeof childName, "string");
        assert(childName.length > 0);

        const ancestors = [
            ...this.names,
            this.name,
        ];

        const childBindings = {
            ancestors,
            childName,
        };

        const pinoLogger = this.parentPinoLogger.child(childBindings);

        const childLogger = new PinoLogger(ancestors, childName, pinoLogger);

        return childLogger;
    }

    private valueReplacer(value: any): string {
        if (value !== null && typeof value === "object" && !!value.stack) {
            return fmtError(value);
        }

        return value;
    }

    private serialize(...args: any[]) {
        return args.map((arg) => this.valueReplacer(arg));
    }
}
