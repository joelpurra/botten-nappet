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
    assert,
} from "check-types";

import path from "path";

// NOTE: this is a hack, modifying the global Rx.Observable.prototype.
import "../../lib/rxjs-extensions/async-filter";

import configLibrary from "config";
import pkgDir from "pkg-dir";

/* tslint:disable no-var-requires */
// TODO: fix typings.
const thenReadJson = require("then-read-json");
/* tslint:enable no-var-requires */

import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";
import DatabaseConnection from "../storage/database-connection";

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueRawTopicsSubscriber from "@botten-nappet/shared/message-queue/raw-topics-subscriber";

/* tslint:disable max-line-length */
import TwitchApplicationTokenManager from "@botten-nappet/backend-twitch/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "@botten-nappet/backend-twitch/authentication/polling-application-token-connection";
/* tslint:enable max-line-length */

import TwitchCSRFHelper from "@botten-nappet/backend-twitch/helper/csrf-helper";
import TwitchRequestHelper from "@botten-nappet/backend-twitch/helper/request-helper";
import TwitchTokenHelper from "@botten-nappet/backend-twitch/helper/token-helper";

import BackendManagerMain from "./manager-main";

export default class BackendMain implements IStartableStoppable {
    private backendManagerMain: BackendManagerMain | null;
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        private gracefulShutdownManager: GracefulShutdownManager,
        private messageQueuePublisher: MessageQueuePublisher,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.backendManagerMain = null;
    }

    public async start(): Promise<void> {
        // TODO: import type for package.json.
        const projectRootDirectoryPath = await pkgDir(__dirname);

        // TODO: better null handling.
        assert.nonEmptyString(projectRootDirectoryPath!);

        const packageJsonPath = path.join(projectRootDirectoryPath!, "package.json");
        const packageJson = await thenReadJson(packageJsonPath);
        const config = new Config(configLibrary, packageJson);
        config.validate();

        const databaseConnection = new DatabaseConnection(this.logger, config.databaseUri);

        const messageQueueAllRawTopicsSubscriber =
            new MessageQueueRawTopicsSubscriber(
                this.logger,
                config.zmqAddress,
                "external",
            );

        const twitchPollingApplicationTokenConnection = new TwitchPollingApplicationTokenConnection(
            this.logger,
            config.twitchAppClientId,
            config.twitchAppClientSecret,
            config.twitchAppScopes,
            config.twitchAppTokenRefreshInterval,
            false,
            config.twitchOAuthTokenUri,
            "post",
        );
        const twitchApplicationTokenManager = new TwitchApplicationTokenManager(
            this.logger,
            twitchPollingApplicationTokenConnection,
            config.twitchAppClientId,
            config.twitchOAuthTokenRevocationUri,
        );
        const twitchCSRFHelper = new TwitchCSRFHelper(this.logger);
        const twitchRequestHelper = new TwitchRequestHelper(this.logger);
        const twitchTokenHelper = new TwitchTokenHelper(
            this.logger,
            twitchRequestHelper,
            config.twitchOAuthTokenRevocationUri,
            config.twitchOAuthTokenVerificationUri,
            config.twitchAppClientId,
        );

        this.backendManagerMain = new BackendManagerMain(
            config,
            this.logger,
            this.gracefulShutdownManager,
            databaseConnection,
            messageQueueAllRawTopicsSubscriber,
            this.messageQueuePublisher,
            twitchRequestHelper,
            twitchCSRFHelper,
            twitchTokenHelper,
            twitchPollingApplicationTokenConnection,
            twitchApplicationTokenManager,
        );

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
