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

import IConnectable from "../../../shared/src/connection/iconnectable";

import GracefulShutdownManager from "../../../shared/src/util/graceful-shutdown-manager";
import PinoLogger from "../../../shared/src/util/pino-logger";
import Config from "../config/config";

import MessageQueuePublisher from "../../../shared/src/message-queue/publisher";

import {
    UserAccessTokenProviderType,
} from "../twitch/authentication/provider-types";

import TwitchPubSubConnection from "../twitch/pubsub/pubsub-connection";

import twitchPerUserPubSubApi from "./twitch-per-user-pubsub-api";

export default async function backendTwitchPubSubAuthenticatedApplicationApi(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchUserAccessTokenProvider: UserAccessTokenProviderType,
    twitchUserId: number,
): Promise<void> {
    const backendTwitchPubSubAuthenticatedApplicationApiLogger
        = rootLogger.child("backendATwitchPubSubuthenticatedApplicationApi");

    const allPubSubTopicsForTwitchUserId = [
        `channel-bits-events-v1.${twitchUserId}`,
        `channel-subscribe-events-v1.${twitchUserId}`,
        `channel-commerce-events-v1.${twitchUserId}`,
        `whispers.${twitchUserId}`,
    ];

    const twitchAllPubSubTopicsForTwitchUserIdConnection = new TwitchPubSubConnection(
        rootLogger,
        config.twitchPubSubWebSocketUri,
        allPubSubTopicsForTwitchUserId,
        twitchUserAccessTokenProvider,
    );

    const connectables: IConnectable[] = [
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    ];

    await Bluebird.map(connectables, async (connectable) => connectable.connect());

    backendTwitchPubSubAuthenticatedApplicationApiLogger.info("Connected.");

    const disconnect = async (incomingError?: Error) => {
        await Bluebird.map(connectables, async (connectable) => {
            try {
                connectable.disconnect();
            } catch (error) {
                backendTwitchPubSubAuthenticatedApplicationApiLogger
                    .error(error, connectable, "Swallowed error while disconnecting.");
            }
        });

        if (incomingError) {
            backendTwitchPubSubAuthenticatedApplicationApiLogger.error(incomingError, "Disconnected.");

            throw incomingError;
        }

        backendTwitchPubSubAuthenticatedApplicationApiLogger.info("Disconnected.");

        return undefined;
    };

    try {
        await twitchPerUserPubSubApi(
            config,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            twitchAllPubSubTopicsForTwitchUserIdConnection,
            twitchUserId,
        );

        await disconnect();
    } catch (error) {
        disconnect(error);
    }
}
