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

import Config from "../config/config";
import GracefulShutdownManager from "../util/graceful-shutdown-manager";
import PinoLogger from "../util/pino-logger";

import MessageQueuePublisher from "../message-queue/publisher";

import TwitchApplicationTokenManager from "../twitch/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "../twitch/authentication/polling-application-token-connection";

import TwitchCSRFHelper from "../twitch/helper/csrf-helper";
import TwitchRequestHelper from "../twitch/helper/request-helper";
import TwitchTokenHelper from "../twitch/helper/token-helper";

import authenticatedApplicationMain from "./authenticated-application-main";

export default async function managedMain(
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchRequestHelper: TwitchRequestHelper,
    twitchCSRFHelper: TwitchCSRFHelper ,
    twitchTokenHelper: TwitchTokenHelper ,
    twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
    twitchApplicationTokenManager: TwitchApplicationTokenManager,
): Promise<void> {
    await twitchPollingApplicationTokenConnection.connect();
    await twitchApplicationTokenManager.start();
    await twitchApplicationTokenManager.getOrWait();

    mainLogger.info("Application authenticated.");

    const disconnectAuthentication = async (incomingError?: Error) => {
        await twitchApplicationTokenManager.stop();
        await twitchPollingApplicationTokenConnection.disconnect();

        if (incomingError) {
            mainLogger.error(incomingError, "Unauthenticated.");

            throw incomingError;
        }

        mainLogger.info("Unauthenticated.");

        return undefined;
    };

    try {
        await authenticatedApplicationMain(
            config,
            mainLogger,
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
