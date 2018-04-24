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
    autoinject,
} from "aurelia-framework";

// NOTE: this is a hack, modifying the global Rx.Observable.prototype.
import "@botten-nappet/backend-shared/lib/rxjs-extensions/async-filter";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/config";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import BackendManagerMain from "./manager-main";

@autoinject
export default class BackendMain implements IStartableStoppable {
    private logger: PinoLogger;

    constructor(
        private readonly config: BackendConfig,
        logger: PinoLogger,
        private readonly backendManagerMain: BackendManagerMain,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);
    }

    public async start(): Promise<void> {
        this.config.validate();

        await this.backendManagerMain.start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.backendManagerMain) {
            await this.backendManagerMain.stop();
        }
    }
}
