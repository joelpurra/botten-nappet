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

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";

/* tslint:disable max-line-length */
import TwitchApplicationTokenManager from "@botten-nappet/backend-twitch/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "@botten-nappet/backend-twitch/authentication/polling-application-token-connection";
/* tslint:enable max-line-length */

import TwitchCSRFHelper from "@botten-nappet/backend-twitch/helper/csrf-helper";
import TwitchRequestHelper from "@botten-nappet/backend-twitch/helper/request-helper";
import TwitchTokenHelper from "@botten-nappet/backend-twitch/helper/token-helper";

import backendAuthenticatedApplicationMain from "./authenticated-application-main";

export default async function backendManagedMain(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchRequestHelper: TwitchRequestHelper,
    twitchCSRFHelper: TwitchCSRFHelper ,
    twitchTokenHelper: TwitchTokenHelper ,
    twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
    twitchApplicationTokenManager: TwitchApplicationTokenManager,
): Promise<void> {
    const backendManagedMainLogger = rootLogger.child("backendManagedMain");

    await twitchPollingApplicationTokenConnection.connect();
    await twitchApplicationTokenManager.start();
    await twitchApplicationTokenManager.getOrWait();

    backendManagedMainLogger.info("Application authenticated.");

    const disconnectAuthentication = async (incomingError?: Error) => {
        await twitchApplicationTokenManager.stop();
        await twitchPollingApplicationTokenConnection.disconnect();

        if (incomingError) {
            backendManagedMainLogger.error(incomingError, "Unauthenticated.");

            throw incomingError;
        }

        backendManagedMainLogger.info("Unauthenticated.");

        return undefined;
    };

    try {
        await backendAuthenticatedApplicationMain(
            config,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            twitchApplicationTokenManager,
            twitchRequestHelper,
            twitchCSRFHelper,
            twitchTokenHelper,
        );

        await disconnectAuthentication();
    } catch (error) {
        disconnectAuthentication(error);
    }
}
