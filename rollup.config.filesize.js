import filesize from "rollup-plugin-filesize";

export default () =>
    filesize({
        showGzippedSize: false,
    });
