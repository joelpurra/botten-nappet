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
    Resolver,
} from "aurelia-dependency-injection";
import {
    assert,
} from "check-types";

import pino from "pino";

import * as path from "path";
import readPkgUp from "read-pkg-up";

import LoggingConfig from "@botten-nappet/shared/src/config/logging-config";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

@asrt(1)
@autoinject
export default class RootLoggerResolver implements Resolver {
    constructor(
        @asrt() private readonly loggingConfig: LoggingConfig,
    ) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof loggingConfig, "object");
    }

    @asrt(0)
    public async get(/*container: Container, key: any*/) {
        // TODO: properly implement resolver? Not using container/key seems wrong.
        // const logPath = `${this.loggingConfig.file}.${process.pid}`;
        // const logFileStream = fs.createWriteStream(logPath);
        // TODO: fix pino's stdout problems or switch logging library.
        const logFileStream = process.stdout;

        // NOTE: makes assumptions regarding the process startup.
        const startingDirectory = path.dirname(process.argv[1]);
        const currentPackageJson = await readPkgUp({
            cwd: startingDirectory,
        });

        const {
            name: currentPackageName,
        } = currentPackageJson.pkg;

        const ancestors = [
            this.loggingConfig.applicationName,
        ];

        const rootPinoLogger = pino({
            extreme: true,
            level: this.loggingConfig.level,
            name: currentPackageName,
            onTerminated: (
                /* tslint:disable:no-unused-variable */
                // eventName,
                // error,
                /* tslint:enable:no-unused-variable */
            ) => {
                // NOTE: override onTerminated to prevent pino from calling process.exit().
            },
        }, logFileStream);

        const logger = new PinoLogger(ancestors, currentPackageName, rootPinoLogger);

        return logger;
    }
}
