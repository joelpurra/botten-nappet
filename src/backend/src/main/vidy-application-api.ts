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

import IConnectable from "@botten-nappet/shared/connection/iconnectable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

/* tslint:disable:max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/message-queue/single-item-topics-subscriber";

import IOutgoingSearchCommand from "@botten-nappet/interface-vidy/command/ioutgoing-search-command";

import vidyApi from "./vidy-api";

/* tslint:enable:max-line-length */

export default async function backendVidyApplicationApi(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
): Promise<void> {
    const authenticatedApplicationMainLogger = rootLogger.child("backendVidyApplicationApi");

    // TODO: configurable.
    const topicsStringSeparator = ":";
    const splitTopics = (topicsString: string): string[] => topicsString.split(topicsStringSeparator);

    const vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<IOutgoingSearchCommand>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicVidyOutgoingSearchCommand),
        );

    const connectables: IConnectable[] = [
        vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
    ];

    await Bluebird.map(connectables, async (connectable) => connectable.connect());

    authenticatedApplicationMainLogger.info("Connected.");

    const disconnect = async (incomingError?: Error) => {
        await Bluebird.map(connectables, async (connectable) => {
            try {
                connectable.disconnect();
            } catch (error) {
                authenticatedApplicationMainLogger.error(error, connectable, "Swallowed error while disconnecting.");
            }
        });

        if (incomingError) {
            authenticatedApplicationMainLogger.error(incomingError, "Disconnected.");

            throw incomingError;
        }

        authenticatedApplicationMainLogger.info("Disconnected.");

        return undefined;
    };

    try {
        await vidyApi(
            config,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            vidyMessageQueueSingleItemJsonTopicsSubscriberForIOutgoingSearchCommand,
        );

        await disconnect();
    } catch (error) {
        disconnect(error);
    }
}
