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

/* tslint:disable max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/message-queue/single-item-topics-subscriber";
import MessageQueueTopicPublisher from "@botten-nappet/shared/message-queue/topic-publisher";

import TwitchIrcConnection from "@botten-nappet/backend-twitch/irc/connection/irc-connection";
import TwitchIrcLoggingHandler from "@botten-nappet/backend-twitch/irc/handler/logging";
import TwitchIrcPingHandler from "@botten-nappet/backend-twitch/irc/handler/ping";
import TwitchIrcReconnectHandler from "@botten-nappet/backend-twitch/irc/handler/reconnect";

import ITwitchIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";
import TwitchIncomingIrcCommandEventTranslator from "@botten-nappet/backend-twitch/irc/translator/incoming-irc-command-event-translator";
import TwitchOutgoingIrcCommandEventHandler from "@botten-nappet/backend-twitch/irc/translator/outgoing-irc-command-event-handler";

/* tslint:enable max-line-length */

export default async function twitchPerUserIrcApi(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchIrcConnection: TwitchIrcConnection,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<ITwitchOutgoingIrcCommand>,
    twitchUserId: number,
): Promise<void> {
    const twitchPerUserIrcApiLogger = rootLogger.child("twitchPerUserIrcApi");

    const twitchIrcReconnectHandler = new TwitchIrcReconnectHandler(
        rootLogger,
        twitchIrcConnection,
    );

    const messageQueueTopicPublisherForIIncomingIrcCommand =
        new MessageQueueTopicPublisher<ITwitchIncomingIrcCommand>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingIrcCommand,
        );

    const twitchIncomingIrcCommandEventTranslator = new TwitchIncomingIrcCommandEventTranslator(
        rootLogger,
        twitchIrcConnection,
        messageQueueTopicPublisherForIIncomingIrcCommand,
    );

    const twitchOutgoingIrcCommandEventHandler = new TwitchOutgoingIrcCommandEventHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
        twitchIrcConnection,
    );

    const twitchIrcLoggingHandler = new TwitchIrcLoggingHandler(
        rootLogger,
        twitchIrcConnection,
    );
    const twitchIrcPingHandler = new TwitchIrcPingHandler(
        rootLogger,
        twitchIrcConnection,
    );

    const startables: IStartableStoppable[] = [
        twitchIrcReconnectHandler,
        twitchIrcLoggingHandler,
        twitchIrcPingHandler,
        twitchIncomingIrcCommandEventTranslator,
        twitchOutgoingIrcCommandEventHandler,
    ];

    const stop = async (incomingError?: Error) => {
        await Bluebird.map(startables, async (startable) => {
            try {
                startable.stop();
            } catch (error) {
                twitchPerUserIrcApiLogger.error(error, startable, "Swallowed error while stopping.");
            }
        });

        if (incomingError) {
            twitchPerUserIrcApiLogger.error(incomingError, "Stopped.");

            throw incomingError;
        }

        twitchPerUserIrcApiLogger.info("Stopped.");

        return undefined;
    };

    try {
        await Bluebird.map(startables, async (startable) => startable.start());

        twitchPerUserIrcApiLogger.info({
            twitchUserId,
            twitchUserName: config.twitchUserName,
        }, "Started listening to events");

        await gracefulShutdownManager.waitForShutdownSignal();

        await stop();
    } catch (error) {
        stop(error);
    }
}
