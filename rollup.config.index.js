import json from "rollup-plugin-json";

import uglify from "./rollup.config.uglify.js";
import filesize from "./rollup.config.filesize.js";
import license from "./rollup.config.license.js";

const inputName = "index";
const fileExtension = ".js";
const fileName = `${inputName}${fileExtension}`;

export default {
    plugins: [
        json(),
        uglify(),
        license(inputName),
        filesize(),
    ],
    input: `${fileName}`,
    output: {
        format: "cjs",
        sourcemap: true,
        name: inputName,
        file: `dist/${fileName}`,
    },
};
