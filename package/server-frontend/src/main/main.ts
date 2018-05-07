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
    context,
} from "@botten-nappet/backend-shared/lib/dependency-injection/context/context";
import {
    scoped,
} from "@botten-nappet/backend-shared/lib/dependency-injection/scoped/scoped";
import {
    within,
} from "@botten-nappet/backend-shared/lib/dependency-injection/within/within";
import {
    Container,
} from "aurelia-framework";

import configLibrary from "config";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";
import FrontendConfig from "../config/frontend-config";

import FrontendManagerMain from "./manager-main";

export default class FrontendMain implements IStartableStoppable {
    private logger: PinoLogger;

    constructor(
        @scoped(FrontendConfig)
        private readonly frontendConfig: FrontendConfig,
        logger: PinoLogger,
        @context(FrontendManagerMain, "FrontendManagerMain")
        private readonly frontendManagerMain: FrontendManagerMain,
        private readonly container: Container,
    ) {
        // TODO DEBUG REMOVE
        console.log(this.constructor.name, "container === container.root", container === container.root);
        console.log(this.constructor.name, "container.parent === container.root", container.parent === container.root);

        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);
    }

    public async start(): Promise<void> {
        this.frontendConfig.validate();

        await this.frontendManagerMain.start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.frontendManagerMain) {
            await this.frontendManagerMain.stop();
        }
    }
}
