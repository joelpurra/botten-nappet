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

import fs from "fs";

import {
    Container,
    InvocationHandler,
} from "aurelia-dependency-injection";

const prepareOutputFilenameTemplate = (filenameTemplate: string) => filenameTemplate
    .replace("${Date.now()}", Date.now().toString(10));

interface IDependencyEdge {
    object: string;
    dependency: string;
    style: string;
}
interface IContextDependencyEdge extends IDependencyEdge {
    context: string;
}

export interface ISubgraphs {
    [key: string]: string[];
}

export interface IGraphsConfig {
    ignoredDependencyNames: string[];
    suffixes: string[];
    manual: ISubgraphs;
    graphvizOutputFilenameTemplate: string;
}

export default function generateDependencyGraph(rootContainer: Container, graphsConfig: IGraphsConfig) {
    const ignoredDependencyNames = graphsConfig.ignoredDependencyNames;
    const subgraphSuffixes = graphsConfig.suffixes;
    const subgraphManual = graphsConfig.manual;
    const graphvizOutputFilename = prepareOutputFilenameTemplate(graphsConfig.graphvizOutputFilenameTemplate);

    const dependencyEdges: Array<IDependencyEdge | IContextDependencyEdge> = [];

    const handlerCreatedCallback = (handler: InvocationHandler): InvocationHandler => {
        const handlerFnName = (handler.fn
            && (handler.fn.name
                || JSON.stringify(handler.fn.toString()))
            || "(No handler name)");

        // if (ignoredNames.includes(handlerFnName)) {
        //     return;
        // }

        const defaultDependencyEdgeStyling = "  edge [color=black];\n";

        handler.dependencies.forEach((dependency) => {
            if (!dependency) {
                throw new Error(`No dependency: ${dependency}`);
            }

            if (typeof dependency._name === "string" && dependency._name.startsWith("context:")) {
                const contextName = dependency._name;

                if (ignoredDependencyNames.includes(contextName)) {
                    return;
                }

                const dependencyName = ((dependency._key
                    && dependency._key.name)
                    || JSON.stringify(dependency._key.toString()))
                    || "(No context dependency name)";

                const dependencyEdgeStyling = "  edge [color=red];\n";

                const contextDependencyEdge: IContextDependencyEdge = {
                    context: contextName,
                    dependency: dependencyName,
                    object: handlerFnName,
                    style: dependencyEdgeStyling,
                };

                dependencyEdges.push(contextDependencyEdge);
            } else {
                const dependencyName = (dependency.name
                    || dependency._name
                    || (dependency._key
                        && dependency._key.name)
                    || JSON.stringify(dependency.toString()))
                    || "(No dependency name)";

                if (ignoredDependencyNames.includes(dependencyName)) {
                    return;
                }

                const dependencyEdge: IDependencyEdge = {
                    dependency: dependencyName,
                    object: handlerFnName,
                    style: defaultDependencyEdgeStyling,
                };

                dependencyEdges.push(dependencyEdge);
            }
        });

        // NOTE: do not modify the handler.
        return handler;
    };

    const closeDependencyGraphCollection = () => {
        const dependencyGraphFileOutputStream = fs.createWriteStream(graphvizOutputFilename);

        dependencyGraphFileOutputStream.write("digraph G {\n  rankdir=LR;\n\n");

        const subgraphs: ISubgraphs = subgraphSuffixes.reduce(
            (obj: ISubgraphs, subgraphSuffix): ISubgraphs => {
                obj[subgraphSuffix] = [];

                return obj;
            },
            {},
        );

        Object.entries(subgraphManual)
            .forEach(([key, values]) => {
                subgraphs[key] = subgraphs[key] ? subgraphs[key].concat(values) : values;
            });

        function checkAndAddUnit(unit: string, subgraphKey: string) {
            const shouldAddSubgraph = (unit.endsWith(subgraphKey)
                && !subgraphs[subgraphKey].includes(unit));
            if (shouldAddSubgraph) {
                subgraphs[subgraphKey].push(unit);
            }
        }

        dependencyEdges.sort((a, b) => {
            if (a.object === b.object) {
                return 0;
            }

            if (a.object < b.object) {
                return -1;
            }

            return 1;
        });

        dependencyEdges
            .forEach((dependencyEdge) => {
                Object.keys(subgraphs)
                    .forEach((subgraphKey) => {
                        checkAndAddUnit(dependencyEdge.object, subgraphKey);
                        checkAndAddUnit(dependencyEdge.dependency, subgraphKey);

                        if ("context" in dependencyEdge) {
                            checkAndAddUnit(dependencyEdge.context, subgraphKey);
                        }
                    });
            });

        Object.values(subgraphs).forEach((subgraph) => {
            subgraph.sort();
        });

        const subgraphsStr = Object.keys(subgraphs)
            .map((subgraphKey) => {
                return `  subgraph "cluster_${
                    subgraphKey
                    }" {\n    style=filled;\n    fillcolor=lightgrey;\n    label="${
                    subgraphKey
                    }";\n    "${
                    subgraphs[subgraphKey].join("\";\n    \"")
                    }";\n  }\n`;
            })
            .join("");

        const dependencyEdgesStr = dependencyEdges
            .map((dependencyEdge) => {
                // HACK: creating two lines in one entry instead of two entries, one line each.
                let dependencyEdgeStr = "";
                dependencyEdgeStr += dependencyEdge.style;

                if ("context" in dependencyEdge) {
                    dependencyEdgeStr += `  ${
                        JSON.stringify(dependencyEdge.object)
                        } -> ${
                        JSON.stringify(dependencyEdge.context)
                        } -> ${
                        JSON.stringify(dependencyEdge.dependency)
                        };\n`;
                } else {
                    dependencyEdgeStr += `  ${
                        JSON.stringify(dependencyEdge.object)
                        } -> ${
                        JSON.stringify(dependencyEdge.dependency)
                        };\n`;
                }

                return dependencyEdgeStr;
            })
            .join("");

        dependencyGraphFileOutputStream.write(subgraphsStr);
        dependencyGraphFileOutputStream.write(dependencyEdgesStr);

        if (dependencyGraphFileOutputStream.writable) {
            dependencyGraphFileOutputStream.write("}\n");
            dependencyGraphFileOutputStream.end();
            dependencyGraphFileOutputStream.close();
        }
    };

    // TODO: use GracefulShutdownHandler.
    // process.once("SIGINT", closeDependencyGraphCollection);
    process.once("beforeExit", closeDependencyGraphCollection);
    // process.once("exit", closeDependencyGraphCollection);

    // NOTE: registration needs to be synchronous, to not miss anything.
    rootContainer.setHandlerCreatedCallback(handlerCreatedCallback);
}
