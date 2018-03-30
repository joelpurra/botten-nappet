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

import IStartableStoppable from "../../../shared/src/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "../../../shared/src/util/graceful-shutdown-manager";
import PinoLogger from "../../../shared/src/util/pino-logger";
import Config from "../config/config";

import MessageQueuePublisher from "../../../shared/src/message-queue/publisher";
import MessageQueueTopicPublisher from "../../../shared/src/message-queue/topic-publisher";

import IncomingPubSubEventTranslator from "../twitch/polling/event-handler/incoming-pubsub-event-translator";
import IIncomingPubSubEvent from "../twitch/polling/event/iincoming-pubsub-event";

import PubSubLoggingHandler from "../twitch/pubsub/handler/logging";
import PubSubPingHandler from "../twitch/pubsub/handler/ping";
import PubSubReconnectHandler from "../twitch/pubsub/handler/reconnect";
import PubSubConnection from "../twitch/pubsub/pubsub-connection";

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
