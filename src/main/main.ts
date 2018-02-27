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

// NOTE: this is a hack, modifying the global Rx.Observable.prototype.
import "../../lib/rxjs-extensions/async-filter";

import configLibrary from "config";

import Config from "../config/config";
import DatabaseConnection from "../storage/database-connection";
import GracefulShutdownManager from "../util/graceful-shutdown-manager";

import MessageQueuePublisher from "../message-queue/publisher";

import TwitchApplicationTokenManager from "../twitch/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "../twitch/authentication/polling-application-token-connection";

import TwitchCSRFHelper from "../twitch/helper/csrf-helper";
import TwitchRequestHelper from "../twitch/helper/request-helper";
import TwitchTokenHelper from "../twitch/helper/token-helper";

import createRootLogger from "./create-root-logger";
import managerMain from "./manager-main";

export default async function main(): Promise<void> {
    const config = new Config(configLibrary);

    config.validate();

    const rootLogger = await createRootLogger(config);

    const mainLogger = rootLogger.child("main");

    const gracefulShutdownManager = new GracefulShutdownManager(rootLogger);
    const databaseConnection = new DatabaseConnection(rootLogger, config.databaseUri);
    const messageQueuePublisher = new MessageQueuePublisher(rootLogger, config.zmqAddress);
    const twitchPollingApplicationTokenConnection = new TwitchPollingApplicationTokenConnection(
        rootLogger,
        config.twitchAppClientId,
        config.twitchAppClientSecret,
        config.twitchAppScopes,
        config.twitchAppTokenRefreshInterval,
        false,
        config.twitchOAuthTokenUri,
        "post",
    );
    const twitchApplicationTokenManager = new TwitchApplicationTokenManager(
        rootLogger,
        twitchPollingApplicationTokenConnection,
        config.twitchAppClientId,
        config.twitchOAuthTokenRevocationUri,
    );
    const twitchCSRFHelper = new TwitchCSRFHelper(rootLogger);
    const twitchRequestHelper = new TwitchRequestHelper(rootLogger);
    const twitchTokenHelper = new TwitchTokenHelper(
        rootLogger,
        twitchRequestHelper,
        config.twitchOAuthTokenRevocationUri,
        config.twitchOAuthTokenVerificationUri,
        config.twitchAppClientId,
    );

    await managerMain(
        config,
        mainLogger,
        rootLogger,
        gracefulShutdownManager,
        databaseConnection,
        messageQueuePublisher,
        twitchRequestHelper,
        twitchCSRFHelper,
        twitchTokenHelper,
        twitchPollingApplicationTokenConnection,
        twitchApplicationTokenManager,
    );
}
