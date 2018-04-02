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

import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

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

import BackendAuthenticatedApplicationMain from "./authenticated-application-main";
import BackendVidyApplicationApi from "./vidy-application-api";

export default class BackendManagedMain implements IStartableStoppable {
    private backendAuthenticatedApplicationMain: BackendAuthenticatedApplicationMain | null;
    private backendVidyApplicationApi: BackendVidyApplicationApi | null;
    private twitchApplicationTokenManager: TwitchApplicationTokenManager;
    private twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection;
    private twitchTokenHelper: TwitchTokenHelper;
    private twitchCSRFHelper: TwitchCSRFHelper;
    private twitchRequestHelper: TwitchRequestHelper;
    private messageQueuePublisher: MessageQueuePublisher;
    private gracefulShutdownManager: GracefulShutdownManager;
    private logger: PinoLogger;
    private config: Config;

    constructor(
        config: Config,
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        messageQueuePublisher: MessageQueuePublisher,
        twitchRequestHelper: TwitchRequestHelper,
        twitchCSRFHelper: TwitchCSRFHelper ,
        twitchTokenHelper: TwitchTokenHelper ,
        twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
        twitchApplicationTokenManager: TwitchApplicationTokenManager,
    ) {
        // TODO: validate arguments.
        this.config = config;
        this.logger = logger.child("BackendManagedMain");
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.messageQueuePublisher = messageQueuePublisher;
        this.twitchRequestHelper = twitchRequestHelper;
        this.twitchCSRFHelper = twitchCSRFHelper;
        this.twitchTokenHelper = twitchTokenHelper;
        this.twitchPollingApplicationTokenConnection = twitchPollingApplicationTokenConnection;
        this.twitchApplicationTokenManager = twitchApplicationTokenManager;

        this.backendVidyApplicationApi = null;
        this.backendAuthenticatedApplicationMain = null;
    }

    public async start(): Promise<void> {
        await this.twitchPollingApplicationTokenConnection.connect();
        await this.twitchApplicationTokenManager.start();

        // NOTE: warmup and server-side token verification.
        await this.twitchApplicationTokenManager.getOrWait();

        this.logger.info("Application authenticated.");

        const disconnectAuthentication = async (incomingError?: Error) => {
            await this.stop();

            if (incomingError) {
                this.logger.error(incomingError, "Unauthenticated.");

                throw incomingError;
            }

            this.logger.info("Unauthenticated.");

            return undefined;
        };

        this.backendVidyApplicationApi = new BackendVidyApplicationApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
        );

        this.backendAuthenticatedApplicationMain = new BackendAuthenticatedApplicationMain(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            this.twitchApplicationTokenManager,
            this.twitchRequestHelper,
            this.twitchCSRFHelper,
            this.twitchTokenHelper,
        );

        try {
            await Promise.all([
                this.backendVidyApplicationApi.start(),

                this.backendAuthenticatedApplicationMain.start(),
            ]);

            await disconnectAuthentication();
        } catch (error) {
            await disconnectAuthentication(error);
        }
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await this.backendVidyApplicationApi!.stop();
        await this.backendAuthenticatedApplicationMain!.stop();
        await this.twitchApplicationTokenManager.stop();
        await this.twitchPollingApplicationTokenConnection.disconnect();
    }
}
