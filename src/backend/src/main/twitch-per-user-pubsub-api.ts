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

import Bluebird from "bluebird";

import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueTopicPublisher from "@botten-nappet/shared/message-queue/topic-publisher";

/* tslint:disable max-line-length */
import IIncomingPubSubEvent from "@botten-nappet/backend-twitch/pubsub/interface/iincoming-pubsub-event";
import IncomingPubSubEventTranslator from "@botten-nappet/backend-twitch/pubsub/translator/incoming-pubsub-event-translator";
/* tslint:enable max-line-length */

import PubSubConnection from "@botten-nappet/backend-twitch/pubsub/connection/pubsub-connection";
import PubSubLoggingHandler from "@botten-nappet/backend-twitch/pubsub/handler/logging";
import PubSubPingHandler from "@botten-nappet/backend-twitch/pubsub/handler/ping";
import PubSubReconnectHandler from "@botten-nappet/backend-twitch/pubsub/handler/reconnect";

export default async function twitchPerUserPubSubApi(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchAllPubSubTopicsForTwitchUserIdConnection: PubSubConnection,
    twitchUserId: number,
): Promise<void> {
    const perUserPubSubApiLogger = rootLogger.child("perUserPubSubApi");

    const twitchPubSubPingHandler = new PubSubPingHandler(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    );
    const twitchPubSubReconnectHandler = new PubSubReconnectHandler(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    );
    const twitchPubSubLoggingHandler = new PubSubLoggingHandler(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    );

    const messageQueueTopicPublisherForIIncomingPubSubEvent =
        new MessageQueueTopicPublisher<IIncomingPubSubEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingPubSubEvent,
        );

    const twitchIncomingPubSubEventTranslator = new IncomingPubSubEventTranslator(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
        messageQueueTopicPublisherForIIncomingPubSubEvent,
    );

    const startables: IStartableStoppable[] = [
        twitchPubSubPingHandler,
        twitchPubSubReconnectHandler,
        twitchPubSubLoggingHandler,
        twitchIncomingPubSubEventTranslator,
    ];

    const stop = async (incomingError?: Error) => {
        await Bluebird.map(startables, async (startable) => {
            try {
                startable.stop();
            } catch (error) {
                perUserPubSubApiLogger.error(error, startable, "Swallowed error while stopping.");
            }
        });

        if (incomingError) {
            perUserPubSubApiLogger.error(incomingError, "Stopped.");

            throw incomingError;
        }

        perUserPubSubApiLogger.info("Stopped.");

        return undefined;
    };

    try {
        await Bluebird.map(startables, async (startable) => startable.start());

        perUserPubSubApiLogger.info({
            twitchUserId,
            twitchUserName: config.twitchUserName,
        }, "Started listening to events");

        await gracefulShutdownManager.waitForShutdownSignal();

        await stop();
    } catch (error) {
        stop(error);
    }
}
