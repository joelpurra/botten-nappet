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

// NOTE: single-import adding reflection metadata globally.
import "reflect-metadata";

import {
    Container,
} from "aurelia-dependency-injection";

import configLibrary,
{
    IConfig,
} from "config";

import loadPackageJson from "@botten-nappet/shared/src/util/load-package-json";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";
import RootLoggerResolver from "@botten-nappet/shared/src/util/root-logger-resolver";

import SharedContainerRoot from "./shared-container-root";

import generateDependencyGraph,
{
    IGraphsConfig,
} from "@botten-nappet/shared/src/depdency-graph/generate-dependency-graph";

const checkAndGenerateGraphs = (rootContainer: Container, rootConfig: IConfig) => {
    const graphsEnabled: boolean = rootConfig.get("graphs.enabled");
    if (graphsEnabled) {
        const graphsDependenciesServerSharedConfig: IGraphsConfig = rootConfig.get("graphs.dependencies.server.shared");

        generateDependencyGraph(rootContainer, graphsDependenciesServerSharedConfig);
    }
};

export default async function main(): Promise<void> {
    const rootContainer = new Container();

    checkAndGenerateGraphs(rootContainer, configLibrary);

    rootContainer.registerInstance("IConfig", configLibrary);

    const packageJson = await loadPackageJson();
    rootContainer.registerInstance("IPackageJson", packageJson);

    const rootLoggerResolver = rootContainer.get(RootLoggerResolver);
    const rootLogger = rootLoggerResolver.get();
    rootContainer.registerInstance(PinoLogger, rootLogger);

    const sharedContainerRoot = rootContainer.get(SharedContainerRoot) as SharedContainerRoot;

    await sharedContainerRoot.start();
    await sharedContainerRoot.stop();
}
