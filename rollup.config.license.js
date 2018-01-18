import license from "rollup-plugin-license";
const path = require("path");

export default (name) =>
    license({
        sourceMap: true,

        banner: {
            file: path.join(__dirname, "LICENSE-BANNER"),
        },

        thirdParty: {
            output: path.join(__dirname, "dist", `${name}.dependencies.txt`),
        },
    });
