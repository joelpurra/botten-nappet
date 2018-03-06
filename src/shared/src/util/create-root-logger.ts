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

import fs from "fs";

import pino from "pino";

import PinoLogger from "../../../shared/src/util/pino-logger";
import ILoggingConfig from "./ilogging-config";

export default async function createRootLogger(config: ILoggingConfig): Promise<PinoLogger> {
    const logFileStream = fs.createWriteStream(config.loggingFile);
    const rootPinoLogger = pino({
        extreme: true,
        level: config.loggingLevel,
        name: config.applicationName,
        onTerminated: (
            /* tslint:disable:no-unused-variable */
            // eventName,
            // error,
            /* tslint:enable:no-unused-variable */
        ) => {
            // NOTE: override onTerminated to prevent pino from calling process.exit().
        },
    }, logFileStream);

    const logger = new PinoLogger(rootPinoLogger);

    return logger;
}
