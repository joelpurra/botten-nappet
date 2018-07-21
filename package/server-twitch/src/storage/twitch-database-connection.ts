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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import DatabaseConfig from "@botten-nappet/backend-shared/src/config/database-config";
import DatabaseConnection from "@botten-nappet/backend-shared/src/storage/database-connection";

@asrt(2)
@autoinject
export default class TwitchDatabaseConnection extends DatabaseConnection {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() databaseConfig: DatabaseConfig,
    ) {
        super(logger, databaseConfig.twitchDatabaseUri);
    }
}
