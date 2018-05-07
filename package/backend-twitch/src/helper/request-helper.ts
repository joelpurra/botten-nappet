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
    autoinject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import qs, {
    IStringifyOptions,
} from "qs";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

@autoinject
export default class RequestHelper {
    private logger: PinoLogger;

    constructor(logger: PinoLogger) {
        assert.equal(arguments.length, 1);
        assert.equal(typeof logger, "object");

        this.logger = logger.child(this.constructor.name);
    }

    public twitchQuerystringSerializer(params: object) {
        // TODO: move to utility class.
        const qsConfig: IStringifyOptions = {
            // NOTE: "repeat" for the "new" Twitch api (v6?).
            arrayFormat: "repeat",
        };

        return qs.stringify(params, qsConfig);
    }

    public serialize(params: object) {
        return this.twitchQuerystringSerializer(params);
    }
}
