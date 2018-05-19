
import graph from "rollup-plugin-graph";

// import typescript from "./rollup.config.typescript.js";
// TODO: enable for production builds?
// import uglify from "./rollup.config.uglify.js";
import filesize from "./rollup.config.filesize.js";
import license from "./rollup.config.license.js";

const BOTTEN_NAPPET_GENERATE_GRAPH = "BOTTEN_NAPPET_GENERATE_GRAPH";

export default function modeSelector(config, inputName) {
    const generateGraphEnvironmentVariable = config[BOTTEN_NAPPET_GENERATE_GRAPH];
    const shouldGenerateGraph = generateGraphEnvironmentVariable === "true";

    let additionalPlugins = null;

    if (shouldGenerateGraph) {
        additionalPlugins = [
            graph(),
        ];
    } else {
        additionalPlugins = [
            // TODO: enable for production builds?
            // uglify(),
            license(inputName),
            filesize(),
        ];
    }

    return additionalPlugins;
}
