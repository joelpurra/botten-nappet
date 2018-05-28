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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";

import DatabaseConnection from "@botten-nappet/backend-shared/src/storage/database-connection";
import ExternalDistributedEventManager from "../distributed-events/external-distributed-event-manager";
import MessageQueueExternalRawTopicsSubscriber from "../message-queue/external-raw-topics-subscriber";

/* tslint:disable max-line-length */

import IApplicationAuthenticationEvent from "@botten-nappet/interface-shared/src/event/iapplication-authentication-event";
import IApplicationUnauthenticationEvent from "@botten-nappet/interface-shared/src/event/iapplication-unauthentication-event";
import ApplicationAuthenticationEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/application-authentication-event-topic-publisher";
import ApplicationUnauthenticationEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/application-unauthentication-event-topic-publisher";

/* tslint:enable max-line-length */

import TwitchAuthenticatedApplicationMain from "@botten-nappet/server-twitch/src/application-main";
import BackendVidyApplicationApi from "@botten-nappet/server-vidy/src/application-api";

@asrt(9)
export default class BackendMain implements IStartableStoppable {
    private logger: PinoLogger;

    constructor(
        @asrt() @context(BackendVidyApplicationApi, "BackendVidyApplicationApi")
        private readonly backendVidyApplicationApi: () => BackendVidyApplicationApi,
        @asrt() @context(TwitchAuthenticatedApplicationMain, "TwitchAuthenticatedApplicationMain")
        private readonly backendTwitchApplicationMain: () => TwitchAuthenticatedApplicationMain,
        @asrt() logger: PinoLogger,
        @asrt() private readonly backendConfig: BackendConfig,
        @asrt() private readonly databaseConnection: DatabaseConnection,
        @asrt() private readonly messageQueueExternalRawTopicsSubscriber: MessageQueueExternalRawTopicsSubscriber,
        @asrt() @scoped(ExternalDistributedEventManager)
        private readonly externalDistributedEventManager: ExternalDistributedEventManager,
        @asrt() private readonly applicationAuthenticationEventEmitter:
            ApplicationAuthenticationEventTopicPublisher,
        @asrt() private readonly applicationUnauthenticationEventEmitter:
            ApplicationUnauthenticationEventTopicPublisher,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async start(): Promise<void> {
        this.logger.info("Starting.");

        this.backendConfig.validate();

        await this.databaseConnection.connect();
        await this.messageQueueExternalRawTopicsSubscriber.connect();

        // TODO: ensure event distributed event manager starts sooner?
        await this.externalDistributedEventManager.start();

        await Promise.all([
            this.backendVidyApplicationApi().start(),

            this.backendTwitchApplicationMain().start(),
        ]);

        this.logger.info("Started.");

        const event: IApplicationAuthenticationEvent = {
            interfaceName: "IApplicationAuthenticationEvent",
        };
        await this.applicationAuthenticationEventEmitter.emit(event);

        this.logger.info("Application authentication initialized.");
    }

    @asrt(0)
    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.

        this.logger.info("Application unauthentication initialized.");

        const event: IApplicationUnauthenticationEvent = {
            interfaceName: "IApplicationUnauthenticationEvent",
        };
        this.applicationUnauthenticationEventEmitter.emit(event);

        if (this.backendVidyApplicationApi) {
            await this.backendVidyApplicationApi().stop();
        }

        if (this.backendTwitchApplicationMain) {
            await this.backendTwitchApplicationMain().stop();
        }

        if (this.externalDistributedEventManager) {
            await this.externalDistributedEventManager.stop();
        }

        await this.messageQueueExternalRawTopicsSubscriber.disconnect();
        await this.databaseConnection.disconnect();
    }
}
