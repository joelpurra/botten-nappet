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

import nodeResolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";

import modeSelector from "./rollup.config.mode-selector";

const inputName = "./package/server-shared/index.js";
const outputName = "./package/server-shared/dist/cjs/index.cjs.js";

const additionalPlugins = modeSelector(process.env, inputName);

export default {
    external: [
        "aurelia-dependency-injection",
        "aurelia-framework",
        "axios",
        "bluebird",
        "camo",
        "check-types",
        "config",
        "crypto",
        "fs",
        "http",
        "koa-static",
        "koa",
        "moment",
        "os",
        "path",
        "pino",
        "pkg-dir",
        "qs",
        "readline",
        "reflect-metadata",
        "rxios",
        "rxjs",
        "rxjs/webSocket",
        "rxjs/operators",
        "socket.io",
        "ws",
        "zeromq-ng",
    ],
    input: inputName,
    onwarn: (warning) => {
        if (!warning) {
            /* tslint:disable no-console */
            // NOTE: lulz.
            console.warn("WARN", "No warning.");
            /* tslint:enable no-console */

            return;
        }

        // https://stackoverflow.com/questions/43556940/rollup-js-and-this-keyword-is-equivalent-to-undefined
        if (warning.code === "THIS_IS_UNDEFINED") {
            return;
        }

        /* tslint:disable no-console */
        console.warn("WARN", warning.message, JSON.stringify(warning));
        /* tslint:enable no-console */
    },
    output: {
        file: outputName,
        format: "cjs",
        name: inputName,
        sourcemap: true,
    },
    plugins: [
        json(),
        nodeResolve({
            jsnext: true,
            main: true,
        }),
        commonjs({
            // exclude: ["node_modules/foo/**", "node_modules/bar/**"],
            include: "node_modules/@botten-nappet/**",
        }),
        ...additionalPlugins,
    ],
};
