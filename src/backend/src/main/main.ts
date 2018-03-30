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

import backendManagerMain from "./manager-main";

export default async function backendMain(
    logger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
): Promise<void> {
    // TODO: import type for package.json.
    const projectRootDirectoryPath = await pkgDir(__dirname);

    // TODO: better null handling.
    assert.nonEmptyString(projectRootDirectoryPath!);

    const packageJsonPath = path.join(projectRootDirectoryPath!, "package.json");

    const packageJson = await thenReadJson(packageJsonPath);

    const config = new Config(configLibrary, packageJson);

    config.validate();

    const backendLogger = logger.child("backendMain");

    const databaseConnection = new DatabaseConnection(backendLogger, config.databaseUri);

    const messageQueueAllRawTopicsSubscriber =
        new MessageQueueRawTopicsSubscriber(
            backendLogger,
            config.zmqAddress,
            "external",
        );

    const twitchPollingApplicationTokenConnection = new TwitchPollingApplicationTokenConnection(
        backendLogger,
        config.twitchAppClientId,
        config.twitchAppClientSecret,
        config.twitchAppScopes,
        config.twitchAppTokenRefreshInterval,
        false,
        config.twitchOAuthTokenUri,
        "post",
    );
    const twitchApplicationTokenManager = new TwitchApplicationTokenManager(
        backendLogger,
        twitchPollingApplicationTokenConnection,
        config.twitchAppClientId,
        config.twitchOAuthTokenRevocationUri,
    );
    const twitchCSRFHelper = new TwitchCSRFHelper(backendLogger);
    const twitchRequestHelper = new TwitchRequestHelper(backendLogger);
    const twitchTokenHelper = new TwitchTokenHelper(
        backendLogger,
        twitchRequestHelper,
        config.twitchOAuthTokenRevocationUri,
        config.twitchOAuthTokenVerificationUri,
        config.twitchAppClientId,
    );

    await backendManagerMain(
        config,
        backendLogger,
        gracefulShutdownManager,
        databaseConnection,
        messageQueueAllRawTopicsSubscriber,
        messageQueuePublisher,
        twitchRequestHelper,
        twitchCSRFHelper,
        twitchTokenHelper,
        twitchPollingApplicationTokenConnection,
        twitchApplicationTokenManager,
    );
}
