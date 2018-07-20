const assert = require("assert")
const fs = require("fs");
const path = require("path");
const Bluebird = require("bluebird");
const pem = require("pem")

const args = process.argv.slice(2);

assert(args.length === 2);

const outputName = args[0];
const outputDirectory = args[1];

const outputPrivateKeyPath = path.join(outputDirectory, `${outputName}.private.key`);
const outputPublicCertificatePath = path.join(outputDirectory, `${outputName}.public.crt`);

const options = {
    days: 1,
    selfSigned: true
};

const createCertificate = Bluebird.promisify(pem.createCertificate, {
    context: pem
});
const writeFile = Bluebird.promisify(fs.writeFile, { context: fs });

createCertificate(options)
    .then((keys) => Promise.all([
        writeFile(outputPrivateKeyPath, keys.serviceKey),
        writeFile(outputPublicCertificatePath, keys.certificate),
    ]))
    .catch((error) => {
        console.error("ERROR", error);

        process.exit(1);
    });
