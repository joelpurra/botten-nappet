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

const assert = require("power-assert");
// const Promise = require("bluebird");

// const axios = require("axios");
const qs = require("qs");

export default class TokenHelper {
    constructor(logger) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof logger, "object");

        this._logger = logger.child("TokenHelper");
    }

    twitchQuerystringSerializer(params) {
        // TODO: move to utility class.
        const qsConfig = {
            // NOTE: "repeat" for the "new" Twitch api (v6?).
            arrayFormat: "repeat",
        };

        return qs.stringify(params, qsConfig);
    };
}
