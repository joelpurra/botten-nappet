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

import {
    Container,
} from "aurelia-dependency-injection";
import {
    assert,
} from "check-types";

import configLibrary,
{
    IConfig,
} from "config";

import readPkgUp from "read-pkg-up";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";
import RootLoggerResolver from "@botten-nappet/shared/src/util/root-logger-resolver";

import SharedContainerRoot from "@botten-nappet/backend-shared/src/main/shared-container-root";

import generateDependencyGraph,
{
    IGraphsConfig,
} from "@botten-nappet/shared/src/depdency-graph/generate-dependency-graph";

import {
    IRealRoot,
} from "@botten-nappet/backend-shared/src/main/ireal-root";
import {
    IRealRootFactory,
} from "@botten-nappet/backend-shared/src/main/ireal-root-factory";

const checkAndGenerateGraphs = (rootContainer: Container, rootConfig: IConfig) => {
    const graphsEnabled: boolean = rootConfig.get("graphs.enabled");
    if (graphsEnabled) {
        const graphsDependenciesServerSharedConfig: IGraphsConfig = rootConfig.get("graphs.dependencies.server.shared");

        generateDependencyGraph(rootContainer, graphsDependenciesServerSharedConfig);
    }
};

export default async function createRootResolver<T extends IRealRoot>(realRootFactory: IRealRootFactory<T>)
    : Promise<void> {
    assert.hasLength(arguments, 1);
    assert.function(realRootFactory);

    const rootContainer = new Container();

    checkAndGenerateGraphs(rootContainer, configLibrary);

    rootContainer.registerInstance("IConfig", configLibrary);

    const packageJson = await readPkgUp();
    rootContainer.registerInstance("IPackageJson", packageJson);

    // TODO: is this a proper custom resolver?
    const rootLoggerResolver: RootLoggerResolver = rootContainer.get(RootLoggerResolver);
    const rootLogger = await rootLoggerResolver.get();
    rootContainer.registerInstance(PinoLogger, rootLogger);
    // rootContainer.autoRegister(PinoLogger, RootLoggerResolver);
    // const rootLogger = rootContainer.get(PinoLogger);

    const rootResolver = (key: any[]) => rootContainer.get(key) as T;
    const realRoot = await realRootFactory(rootResolver);

    rootContainer.registerInstance("IRealRoot", realRoot);

    const sharedContainerRoot = rootContainer.get(SharedContainerRoot) as SharedContainerRoot;

    try {
        await sharedContainerRoot.start();
    } catch (error) {
        throw error;
    } finally {
        try {
            await sharedContainerRoot.stop();
        } catch (stoppingError) {
            rootLogger.error(stoppingError, "Masking related error while stopping due to error.", "stoppingError");
        }
    }
}
