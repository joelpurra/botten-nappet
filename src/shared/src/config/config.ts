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

import {
    IConfig,
} from "config";
import ILoggingConfig from "../util/izmq-config";
import IZmqConfig from "../util/izmq-config";

export default class Config implements ILoggingConfig, IZmqConfig {
    public prefix: string;
    private config: IConfig;

    constructor(config: IConfig) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof config, "object");

        this.config = config;

        this.prefix = "shared";
    }

    public validate(): any {
        // TODO: more dynamic config value list?
        // TODO: add validation error messages.
        assert.nonEmptyString(this.applicationName);
        assert.nonEmptyString(this.loggingLevel);
        assert.nonEmptyString(this.loggingFile);
        assert.nonEmptyString(this.zmqAddress);
    }

    public get applicationName(): string {
        const value = this.config.get<string>(`${this.prefix}.applicationName`);

        assert.nonEmptyString(value);

        return value;
    }

    public get loggingLevel(): string {
        const value = this.config.get<string>(`${this.prefix}.logging.level`);

        assert.nonEmptyString(value);

        return value;
    }

    public get loggingFile(): string {
        const value = this.config.get<string>(`${this.prefix}.logging.file`);

        assert.nonEmptyString(value);

        return value;
    }

    public get zmqAddress(): string {
        const value = this.config.get<string>(`${this.prefix}.zmqAddress`);

        assert.nonEmptyString(value);
        assert(value.startsWith("tcp://"));

        return value;
    }
}
