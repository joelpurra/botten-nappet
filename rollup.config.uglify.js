import uglify from "rollup-plugin-uglify";
import {
    minify,
} from "uglify-es";

export default () =>
    uglify({
        // TODO: build configuration.
        keep_fnames: true,
    }, minify);
