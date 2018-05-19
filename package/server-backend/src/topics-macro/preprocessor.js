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

const Bluebird = require("bluebird");
const {
    assert,
} = require("check-types");

const {
    join: joinPaths,
} = require("path");

const {
    createReadStream,
    createWriteStream,
} = require("fs");

const config = require("config");

const mergeOptions = require("merge-options");
var objectPath = require("object-path");
const changeCase = require("change-case");

const M4 = require("m4");

const templateName = process.argv[2];
const templateConfigFromConfigFile = mergeOptions(config.templates[templateName]);
assert.object(templateConfigFromConfigFile);

const resolvePath = async (...pathParts) => joinPaths(__dirname, ...pathParts);

const getReadStream = async (...pathParts) => {
    const filePath = await resolvePath(...pathParts);

    return createReadStream(filePath, {
        encoding: "utf8",
    });
};

const getWriteStream = async (...pathParts) => {
    const filePath = await resolvePath(...pathParts);

    return createWriteStream(filePath, {
        encoding: "utf8",
    });
};

const createDefaultTransformer = async (
    sectionNameLowerCase,
    groupNameLowerCase,
    groupNamePascalCase,
    topicNameParamCase,
    topicNamePascalCase,
    configClassPath,
) => {
    const transformer = new M4();

    transformer.define("___SECTION_NAME_LOWER_CASE___", sectionNameLowerCase);
    transformer.define("___GROUP_NAME_LOWER_CASE___", groupNameLowerCase);
    transformer.define("___GROUP_NAME_PASCAL_CASE___", groupNamePascalCase);
    transformer.define("___TOPIC_NAME_PARAM_CASE___", topicNameParamCase);
    transformer.define("___TOPIC_NAME_PASCAL_CASE___", topicNamePascalCase);
    transformer.define("___TOPIC_CONFIG_PATH___", configClassPath);

    return transformer;
};

const transform = async (
    sectionNameLowerCase,
    groupNameLowerCase,
    groupNamePascalCase,
    topicNameParamCase,
    topicNamePascalCase,
    configClassPath,
    relativeTemplatePath,
    relativeOutputDirectoryPath,
    outputFileName,
) => {
    const transformer = await createDefaultTransformer(
        sectionNameLowerCase,
        groupNameLowerCase,
        groupNamePascalCase,
        topicNameParamCase,
        topicNamePascalCase,
        configClassPath,
    );

    const templateReadStream = await getReadStream(relativeTemplatePath);
    const outputWriteStream = await getWriteStream(relativeOutputDirectoryPath, outputFileName);

    templateReadStream
        .pipe(transformer)
        .pipe(outputWriteStream);
};

const processSectionGroupTopic = async (sectionName, groupName, topicName, configClassPath) => {
    const sectionNameLowerCase = changeCase.lowerCase(sectionName);
    const groupNameLowerCase = changeCase.lowerCase(groupName);
    const groupNamePascalCase = changeCase.pascalCase(groupName);
    const topicNameParamCase = changeCase.paramCase(topicName);
    const topicNamePascalCase = changeCase.pascalCase(topicName);

    return Bluebird.map(
        Object.values(templateConfigFromConfigFile.templatePaths),
        async (templatePath) => {
            // TODO: string templating system?
            const topicFileName = templatePath.fileName
                .replace("${topicNameParamCase}", topicNameParamCase);

            await transform(
                sectionNameLowerCase,
                groupNameLowerCase,
                groupNamePascalCase,
                topicNameParamCase,
                topicNamePascalCase,
                configClassPath,
                templatePath.template,
                templatePath.outputDirectory,
                topicFileName,
            );
        },
    );
};

// TODO: use lodash or something.
const processSectionGroupTopics = async (topicSections, sectionName, groupName) => Bluebird
    .map(
        topicSections[sectionName].groups[groupName].topicNames,
        (topicName) => processSectionGroupTopic(
            sectionName,
            groupName,
            topicName,
            topicSections[sectionName].configClassPath,
        ),
);

// TODO: use lodash or something.
const processTopicSection = async (topicSections, sectionName) => Bluebird
    .map(
        Object.keys(topicSections[sectionName].groups),
        (groupName) => processSectionGroupTopics(topicSections, sectionName, groupName),
);

// TODO: use lodash or something.
const processTopicSections = async (topicSections) => Bluebird
    .map(
        Object.keys(topicSections),
        (sectionName) => processTopicSection(topicSections, sectionName),
);

const loadTopics = async (templateConfig) => {
    // NOTE: mutating the copy.
    const templateConfigWithTopics = mergeOptions(templateConfig);

    // TODO: use lodash or something.
    Object.values(templateConfigWithTopics.sections).forEach((topicSection) => {
        Object.values(topicSection.groups).forEach((group) => {
            const topics = objectPath.get(config, group.topicConfigObjectPath);

            group.topicNames = Object.keys(topics);
        });
    });

    return templateConfigWithTopics;
};

const prepareAndProcess = async (templateConfig) => {
    const templateConfigWithTopics = await loadTopics(templateConfig);

    return processTopicSections(templateConfigWithTopics.sections);
};

const main = async () => {
    try {
        await prepareAndProcess(templateConfigFromConfigFile);
    } catch (error) {
        /* tslint:disable no-console */
        console.error("ERROR", error.toString(), "\n", error.stack);
        /* tslint:enable no-console */
    }
};

main();
