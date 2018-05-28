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
    inject,
} from "aurelia-dependency-injection";
import {
    assert,
} from "check-types";

// TODO DEBUG: for some reason it won't compile referencing IPackageJson.
// import IPackageJson from "./ipackage-json";

@inject("IPackageJson")
export default class PackageJsonProvider {
    constructor(
        // TODO DEBUG: for some reason it won't compile referencing IPackageJson.
        // private readonly packageJson: IPackageJson,
        private readonly packageJson: any,
    ) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof packageJson, "object");
    }

    public get name(): string {
        const value = this.packageJson.name;

        assert.nonEmptyString(value);

        return value;
    }

    public get version(): string {
        const value = this.packageJson.version;

        assert.nonEmptyString(value);

        return value;
    }
}
