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
import MessageQueueTopicPublisher from "@botten-nappet/shared/message-queue/topic-publisher";

import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/interface/response/polling/icheermotes-polling-response";
import IPollingFollowingResponse from "@botten-nappet/backend-twitch/interface/response/polling/ifollowing-polling-response";
import IPollingStreamingResponse from "@botten-nappet/backend-twitch/interface/response/polling/istreaming-polling-response";
import PollingClientIdConnection from "@botten-nappet/backend-twitch/polling/connection/polling-clientid-connection";

import IncomingCheermotesCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-cheermotes-event-translator";
import IncomingFollowingCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-following-event-translator";
import IncomingStreamingCommandEventTranslator from "@botten-nappet/backend-twitch/translator/incoming-streaming-event-translator";

import IIncomingCheermotesEvent from "@botten-nappet/interface-twitch/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "@botten-nappet/interface-twitch/event/iincoming-following-event";
import IIncomingStreamingEvent from "@botten-nappet/interface-twitch/event/iincoming-streaming-event";

/* tslint:enable max-line-length */

export default async function twitchPerUserPollingApi(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchPollingFollowingConnection: PollingClientIdConnection<IPollingFollowingResponse>,
    twitchPollingStreamingConnection: PollingClientIdConnection<IPollingStreamingResponse>,
    twitchPollingCheermotesConnection: PollingClientIdConnection<IPollingCheermotesResponse>,
    twitchUserId: number,
): Promise<void> {
    const perUserHandlersMainLogger = rootLogger.child("perUserHandlersMain");

    const messageQueueTopicPublisherForIIncomingFollowingEvent =
        new MessageQueueTopicPublisher<IIncomingFollowingEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingFollowingEvent,
        );

    const messageQueueTopicPublisherForIIncomingStreamingEvent =
        new MessageQueueTopicPublisher<IIncomingStreamingEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingStreamingEvent,
        );

    const messageQueueTopicPublisherForIIncomingCheermotesEvent =
        new MessageQueueTopicPublisher<IIncomingCheermotesEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingCheermotesEvent,
        );

    const twitchIncomingFollowingCommandEventTranslator = new IncomingFollowingCommandEventTranslator(
        rootLogger,
        twitchPollingFollowingConnection,
        messageQueueTopicPublisherForIIncomingFollowingEvent,
        config.twitchUserName,
        twitchUserId,
    );

    const twitchIncomingStreamingCommandEventTranslator = new IncomingStreamingCommandEventTranslator(
        rootLogger,
        twitchPollingStreamingConnection,
        messageQueueTopicPublisherForIIncomingStreamingEvent,
        config.twitchUserName,
        twitchUserId,
    );

    const twitchIncomingCheermotesCommandEventTranslator = new IncomingCheermotesCommandEventTranslator(
        rootLogger,
        twitchPollingCheermotesConnection,
        messageQueueTopicPublisherForIIncomingCheermotesEvent,
        config.twitchUserName,
        twitchUserId,
    );

    const startables: IStartableStoppable[] = [
        twitchIncomingFollowingCommandEventTranslator,
        twitchIncomingStreamingCommandEventTranslator,
        twitchIncomingCheermotesCommandEventTranslator,
    ];

    const stop = async (incomingError?: Error) => {
        await Bluebird.map(startables, async (startable) => {
            try {
                startable.stop();
            } catch (error) {
                perUserHandlersMainLogger.error(error, startable, "Swallowed error while stopping.");
            }
        });

        if (incomingError) {
            perUserHandlersMainLogger.error(incomingError, "Stopped.");

            throw incomingError;
        }

        perUserHandlersMainLogger.info("Stopped.");

        return undefined;
    };

    try {
        await Bluebird.map(startables, async (startable) => startable.start());

        perUserHandlersMainLogger.info({
            twitchUserId,
            twitchUserName: config.twitchUserName,
        }, "Started listening to events");

        await gracefulShutdownManager.waitForShutdownSignal();

        await stop();
    } catch (error) {
        stop(error);
    }
}
