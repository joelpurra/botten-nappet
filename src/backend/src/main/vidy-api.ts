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

import VidyAuthenticatedRequest from "@botten-nappet/backend-vidy/request/authenticated-request";
import VidyOutgoingSearchCommandHandler from "@botten-nappet/backend-vidy/translator/outgoing-search-command-handler";
import VidyIIncomingSearchResultEvent from "@botten-nappet/interface-vidy/command/iincoming-search-result-event";
import VidyIOutgoingSearchCommand from "@botten-nappet/interface-vidy/command/ioutgoing-search-command";

/* tslint:enable max-line-length */

export default async function vidyApi(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<VidyIOutgoingSearchCommand>,
): Promise<void> {
    const perUserHandlersMainLogger = rootLogger.child("perUserHandlersMain");

    const messageQueueTopicPublisherForIIncomingSearchResultEvent =
        new MessageQueueTopicPublisher<VidyIIncomingSearchResultEvent>(
            rootLogger,
            messageQueuePublisher,
            config.topicVidyIncomingSearchResultEvent,
        );

    const vidyAuthenticatedRequest = new VidyAuthenticatedRequest(rootLogger, config);

    const vidyOutgoingSearchCommandHandler = new VidyOutgoingSearchCommandHandler(
        rootLogger,
        messageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
        messageQueueTopicPublisherForIIncomingSearchResultEvent,
        vidyAuthenticatedRequest,
        config.vidyRootUrl,
    );

    const startables: IStartableStoppable[] = [
        vidyOutgoingSearchCommandHandler,
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
            vidyKeyId: config.vidyKeyId,
        }, "Started listening to events");

        await gracefulShutdownManager.waitForShutdownSignal();

        await stop();
    } catch (error) {
        stop(error);
    }
}
