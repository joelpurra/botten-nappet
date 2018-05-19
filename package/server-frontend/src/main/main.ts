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
    assert,
} from "check-types";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import FrontendConfig from "../config/frontend-config";

import FrontendManagerMain from "./manager-main";

export default class FrontendMain implements IStartableStoppable {
    constructor(
        @context(FrontendManagerMain, "FrontendManagerMain")
        private readonly frontendManagerMain: () => FrontendManagerMain,
        @scoped(FrontendConfig)
        private readonly frontendConfig: FrontendConfig,
    ) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof frontendManagerMain, "function");
        assert.equal(typeof frontendConfig, "object");
    }

    public async start(): Promise<void> {
        assert.hasLength(arguments, 0);

        this.frontendConfig.validate();

        await this.frontendManagerMain().start();
    }

    public async stop(): Promise<void> {
        assert.hasLength(arguments, 0);

        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.frontendManagerMain) {
            await this.frontendManagerMain().stop();
        }
    }
}
