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
    factory,
} from "aurelia-framework";

// NOTE: this is a hack, modifying the global Rx.Observable.prototype.
import "../../lib/rxjs-extensions/async-filter";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/config";
import DatabaseConnection from "@botten-nappet/backend-shared/src/storage/database-connection";
import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import MessageQueuePublisher from "@botten-nappet/shared/src/message-queue/publisher";
import MessageQueueRawTopicsSubscriber from "@botten-nappet/shared/src/message-queue/raw-topics-subscriber";

/* tslint:disable max-line-length */
import TwitchApplicationTokenManager from "@botten-nappet/backend-twitch/src/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "@botten-nappet/backend-twitch/src/authentication/polling-application-token-connection";
/* tslint:enable max-line-length */

import TwitchCSRFHelper from "@botten-nappet/backend-twitch/src/helper/csrf-helper";
import TwitchRequestHelper from "@botten-nappet/backend-twitch/src/helper/request-helper";
import TwitchTokenHelper from "@botten-nappet/backend-twitch/src/helper/token-helper";

import BackendManagerMain from "./manager-main";

@autoinject
export default class BackendMain implements IStartableStoppable {
    private backendManagerMain: BackendManagerMain | null;
    private logger: PinoLogger;

    constructor(
        private readonly config: BackendConfig,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private readonly databaseConnection: DatabaseConnection,
        @factory(MessageQueueRawTopicsSubscriber)
        private readonly messageQueueRawTopicsSubscriberFactory:
            (...topics: string[]) => MessageQueueRawTopicsSubscriber,
        private readonly twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
        private readonly twitchApplicationTokenManager: TwitchApplicationTokenManager,
        private readonly twitchCSRFHelper: TwitchCSRFHelper,
        private readonly twitchRequestHelper: TwitchRequestHelper,
        private readonly twitchTokenHelper: TwitchTokenHelper,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.backendManagerMain = null;
    }

    public async start(): Promise<void> {
        this.config.validate();

        const messageQueueAllRawTopicsSubscriber =
            this.messageQueueRawTopicsSubscriberFactory(
                "external",
            );

        this.backendManagerMain = new BackendManagerMain(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.databaseConnection,
            messageQueueAllRawTopicsSubscriber,
            this.messageQueuePublisher,
            this.twitchRequestHelper,
            this.twitchCSRFHelper,
            this.twitchTokenHelper,
            this.twitchPollingApplicationTokenConnection,
            this.twitchApplicationTokenManager,
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
