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
    scoped,
} from "@botten-nappet/backend-shared/lib/dependency-injection/scoped/scoped";
import {
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
import Bluebird from "bluebird";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";

/* tslint:disable max-line-length */

import ExternalDistributedEventManager from "@botten-nappet/server-backend/src/distributed-events/external-distributed-event-manager";
import MessageQueueExternalRawTopicsSubscriber from "@botten-nappet/server-backend/src/message-queue/external-raw-topics-subscriber";
import SharedDatabaseConnection from "@botten-nappet/server-backend/src/storage/shared-database-connection";
import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";

import IApplicationAuthenticationEvent from "@botten-nappet/interface-shared/src/event/iapplication-authentication-event";
import IApplicationUnauthenticationEvent from "@botten-nappet/interface-shared/src/event/iapplication-unauthentication-event";
import ApplicationAuthenticationEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/application-authentication-event-topic-publisher";
import ApplicationUnauthenticationEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/application-unauthentication-event-topic-publisher";

/* tslint:enable max-line-length */

@asrt(8)
export default class BackendMain implements IStartableStoppable {
    private logger: PinoLogger;
    private shouldBroadcastApplicationAuthenticationHack: boolean = false;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly backendConfig: BackendConfig,
        @asrt() private readonly gracefulShutdownManager: GracefulShutdownManager,
        @asrt() private readonly sharedDatabaseConnection: SharedDatabaseConnection,
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

        await this.sharedDatabaseConnection.connect();
        await this.messageQueueExternalRawTopicsSubscriber.connect();

        // TODO: ensure event distributed event manager starts sooner?
        await this.externalDistributedEventManager.start();

        this.logger.info("Started.");

        const event: IApplicationAuthenticationEvent = {
            interfaceName: "IApplicationAuthenticationEvent",
        };
        await this.applicationAuthenticationEventEmitter.emit(event);

        this.logger.info("Application authentication initialized.");

        // TODO HACK REMOVE: find better solution than to rebroadcast application state.
        this.shouldBroadcastApplicationAuthenticationHack = true;

        const broadcastApplicationAuthenticationHack = (): Bluebird<void> => Bluebird.delay(1000)
            .then(() => this.applicationAuthenticationEventEmitter.emit(event))
            .then(() => {
                // TODO: if this hack is kept around, ensure it doesn't hog resources due to recursion.
                if (this.shouldBroadcastApplicationAuthenticationHack) {
                    broadcastApplicationAuthenticationHack();
                }
            });

        this.logger.warn("Application authentication hack initialized.");
        broadcastApplicationAuthenticationHack();

        await this.gracefulShutdownManager.waitForShutdownSignal();

        this.shouldBroadcastApplicationAuthenticationHack = false;
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

        if (this.externalDistributedEventManager) {
            await this.externalDistributedEventManager.stop();
        }

        await this.messageQueueExternalRawTopicsSubscriber.disconnect();
        await this.sharedDatabaseConnection.disconnect();
    }
}
