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

import configLibrary from "config";

import SharedConfig from "../config/config";
import PinoLogger from "../util/pino-logger";

import createRootLogger from "../util/create-root-logger";
import loadPackageJson from "../util/load-package-json";

import MessageQueuePublisher from "../message-queue/publisher";
import MessageQueuePublisherResolver from "./resolver/message-queue-publisher-resolver";

import RootLoggerResolver from "@botten-nappet/shared/util/root-logger-resolver";
import DatabaseConnection from "../../../backend/src/storage/database-connection";
import SharedContainerRoot from "./shared-container-root";

export default async function main(): Promise<void> {
    const rootContainer = new Container();

    rootContainer.registerInstance("IConfig", configLibrary);

    const packageJson = await loadPackageJson();
    rootContainer.registerInstance("IPackageJson", packageJson);

    const sharedConfig = new SharedConfig(configLibrary);
    sharedConfig.validate();
    rootContainer.registerInstance(SharedConfig, sharedConfig);

    const rootLoggerResolver = rootContainer.get(RootLoggerResolver);
    const rootLogger = rootLoggerResolver.get();
    rootContainer.registerInstance(PinoLogger, rootLogger);

    const sharedContainerRoot = rootContainer.get(SharedContainerRoot) as SharedContainerRoot;

    await sharedContainerRoot.start();
    await sharedContainerRoot.stop();
}
