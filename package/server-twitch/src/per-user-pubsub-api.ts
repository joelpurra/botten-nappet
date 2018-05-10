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
    within,
} from "@botten-nappet/backend-shared/lib/dependency-injection/within/within";
import Bluebird from "bluebird";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import TwitchUserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import TwitchUserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";

/* tslint:disable max-line-length */

import IncomingPubSubEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-pub-sub-event-topic-publisher";

import IncomingPubSubEventTranslator from "@botten-nappet/backend-twitch/src/pubsub/translator/incoming-pubsub-event-translator";

import PubSubConnection from "@botten-nappet/backend-twitch/src/pubsub/connection/pubsub-connection";
import PubSubLoggingHandler from "@botten-nappet/backend-twitch/src/pubsub/handler/logging";
import PubSubPingHandler from "@botten-nappet/backend-twitch/src/pubsub/handler/ping";
import PubSubReconnectHandler from "@botten-nappet/backend-twitch/src/pubsub/handler/reconnect";

/* tslint:enable max-line-length */

export default class TwitchPerUserPubSubApi {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        @within(PubSubConnection, "TwitchPerUserPubSubApi")
        private readonly twitchAllPubSubTopicsForTwitchUserIdConnection: PubSubConnection,
        @scoped(IncomingPubSubEventTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingPubSubEvent:
            IncomingPubSubEventTopicPublisher,
        @within(TwitchUserNameProvider, "PerUserHandlersMain")
        private readonly twitchUserNameProvider: TwitchUserNameProvider,
        @within(TwitchUserIdProvider, "PerUserHandlersMain")
        private readonly twitchUserIdProvider: TwitchUserIdProvider,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    public async start(): Promise<void> {
        const twitchPubSubPingHandler = new PubSubPingHandler(
            this.logger,
            this.twitchAllPubSubTopicsForTwitchUserIdConnection,
        );
        const twitchPubSubReconnectHandler = new PubSubReconnectHandler(
            this.logger,
            this.twitchAllPubSubTopicsForTwitchUserIdConnection,
        );
        const twitchPubSubLoggingHandler = new PubSubLoggingHandler(
            this.logger,
            this.twitchAllPubSubTopicsForTwitchUserIdConnection,
        );

        const twitchIncomingPubSubEventTranslator = new IncomingPubSubEventTranslator(
            this.logger,
            this.twitchAllPubSubTopicsForTwitchUserIdConnection,
            this.messageQueueTopicPublisherForIIncomingPubSubEvent,
        );

        this.startables.push(twitchPubSubPingHandler);
        this.startables.push(twitchPubSubReconnectHandler);
        this.startables.push(twitchPubSubLoggingHandler);
        this.startables.push(twitchIncomingPubSubEventTranslator);

        await Bluebird.map(this.startables, async (startable) => startable.start());

        this.logger.info({
            twitchUserId: await this.twitchUserIdProvider.get(),
            twitchUserName: await this.twitchUserNameProvider.get(),
        }, "Started listening to events");

        await this.gracefulShutdownManager.waitForShutdownSignal();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await Bluebird.map(
            this.startables,
            async (startable) => {
                try {
                    await startable.stop();
                } catch (error) {
                    this.logger.error(error, startable, "Swallowed error while stopping.");
                }
            },
        );
    }
}
