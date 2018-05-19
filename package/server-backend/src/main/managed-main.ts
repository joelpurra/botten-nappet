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
    asrt,
} from "@botten-nappet/shared/src/util/asrt";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */
import TwitchApplicationTokenManager from "@botten-nappet/backend-twitch/src/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "@botten-nappet/backend-twitch/src/authentication/polling-application-token-connection";
/* tslint:enable max-line-length */

import BackendVidyApplicationApi from "@botten-nappet/server-vidy/src/application-api";

import BackendAuthenticatedApplicationMain from "./authenticated-application-main";

@asrt(5)
export default class BackendManagedMain implements IStartableStoppable {
    private logger: PinoLogger;

    constructor(
        @asrt() @context(BackendVidyApplicationApi, "BackendVidyApplicationApi")
        private readonly backendVidyApplicationApi: () => BackendVidyApplicationApi,
        @asrt() @context(BackendAuthenticatedApplicationMain, "BackendAuthenticatedApplicationMain")
        private readonly backendAuthenticatedApplicationMain: () => BackendAuthenticatedApplicationMain,
        @asrt() logger: PinoLogger,
        @asrt() @scoped(TwitchPollingApplicationTokenConnection)
        private readonly twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
        @asrt() @scoped(TwitchApplicationTokenManager)
        private readonly twitchApplicationTokenManager: TwitchApplicationTokenManager,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async start(): Promise<void> {
        await this.twitchPollingApplicationTokenConnection.connect();
        await this.twitchApplicationTokenManager.start();

        // NOTE: warmup and server-side token verification.
        await this.twitchApplicationTokenManager.getOrWait();

        this.logger.info("Application authenticated.");

        await Promise.all([
            this.backendVidyApplicationApi().start(),

            this.backendAuthenticatedApplicationMain().start(),
        ]);
    }

    @asrt(0)
    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.backendVidyApplicationApi) {
            await this.backendVidyApplicationApi().stop();
        }

        if (this.backendAuthenticatedApplicationMain) {
            await this.backendAuthenticatedApplicationMain().stop();
        }

        await this.twitchApplicationTokenManager.stop();
        await this.twitchPollingApplicationTokenConnection.disconnect();
    }
}
