const assert = require("assert")
const fs = require("fs");
const path = require("path");
const Bluebird = require("bluebird");
const zmq = require("zeromq-ng");

const args = process.argv.slice(2);

assert(args.length === 2);

const outputName = args[0];
const outputDirectory = args[1];

const outputPrivateKeyPath = path.join(outputDirectory, `${outputName}.private.key`);
const outputPublicKeyPath = path.join(outputDirectory, `${outputName}.public.key`);

const createCurveKeypair = Bluebird.resolve(zmq.curveKeypair());
const writeFile = Bluebird.promisify(fs.writeFile, { context: fs });

createCurveKeypair
    .then((keys) => Promise.all([
        writeFile(outputPrivateKeyPath, keys.secretKey),
        writeFile(outputPublicKeyPath, keys.publicKey),
    ]))
    .catch((error) => {
        console.error("ERROR", error);

        process.exit(1);
    });
