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
    inject,
} from "aurelia-dependency-injection";
import {
    assert,
} from "check-types";

import {
    IConfig,
} from "config";

@asrt(1)
@inject("IConfig")
export default class FrontendConfig {
    private prefix: string;

    constructor(
        @asrt() private readonly config: IConfig,
    ) {
        this.prefix = "frontend";
    }

    @asrt(0)
    public validate(): any {
        // TODO: more dynamic config value list?
        // TODO: add validation error messages.
        assert.nonEmptyString(this.staticPublicRootDirectory);
        assert.integer(this.port);
        assert.positive(this.port);
    }

    public get staticPublicRootDirectory(): string {
        const value = this.config.get<string>(`${this.prefix}.static.publicRootDirectory`);

        assert.nonEmptyString(value);

        return value;
    }

    public get port(): number {
        const value = this.config.get<number>(`${this.prefix}.port`);

        assert.integer(value);
        assert.positive(value);

        return value;
    }
}
