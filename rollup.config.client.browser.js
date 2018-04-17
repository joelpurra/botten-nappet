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

import json from "rollup-plugin-json";

import typescript from "./rollup.config.typescript.js";
// TODO: enable for production builds?
// import uglify from "./rollup.config.uglify.js";
import filesize from "./rollup.config.filesize.js";
import license from "./rollup.config.license.js";

const inputName = "client.browser.ts";
const outputName = "./src/frontend/public/dist/client.browser.js";

export default {
    external: [
        "animejs",
        "rxjs",
        "socket.io-client",
    ],
    input: inputName,
    output: {
        file: outputName,
        format: "iife",
        globals: {
            "animejs": "anime",
            "rxjs": "Rx",
            "socket.io-client": "io",
        },
        name: inputName,
        sourcemap: true,
    },
    plugins: [
        json(),
        typescript(),
        // TODO: enable for production builds?
        // uglify(),
        license(inputName),
        filesize(),
    ],
};