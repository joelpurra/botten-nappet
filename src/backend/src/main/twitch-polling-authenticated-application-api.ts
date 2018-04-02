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

import PollingClientIdConnection from "@botten-nappet/backend-twitch/polling/connection/polling-clientid-connection";

import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/interface/response/polling/icheermotes-polling-response";
import IPollingFollowingResponse from "@botten-nappet/backend-twitch/interface/response/polling/ifollowing-polling-response";
import IPollingStreamingResponse from "@botten-nappet/backend-twitch/interface/response/polling/istreaming-polling-response";

import twitchPerUserPollingApi from "./twitch-per-user-polling-api";

/* tslint:enable:max-line-length */

export default async function backendTwitchPollingAuthenticatedApplicationApi(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchUserId: number,
): Promise<void> {
    const backendTwitchPollingAuthenticatedApplicationApiLogger
        = rootLogger.child("backendTwitchPollingAuthenticatedApplicationApi");

    // TODO: externalize/configure base url.
    const followingPollingUri =
        `https://api.twitch.tv/kraken/channels/${twitchUserId}/follows?limit=${config.followingPollingLimit}`;

    // TODO: externalize/configure base url.
    const streamingPollingUri = `https://api.twitch.tv/helix/streams?user_id=${twitchUserId}`;

    // TODO: externalize/configure base url.
    const cheermotesPollingUri = `https://api.twitch.tv/kraken/bits/actions?channel_id=${twitchUserId}`;

    const twitchPollingFollowingConnection = new PollingClientIdConnection<IPollingFollowingResponse>(
        rootLogger,
        config.twitchAppClientId,
        config.bottenNappetDefaultPollingInterval,
        false,
        followingPollingUri,
        "get",
    );
    const twitchPollingStreamingConnection = new PollingClientIdConnection<IPollingStreamingResponse>(
        rootLogger,
        config.twitchAppClientId,
        config.bottenNappetStreamingPollingInterval,
        true,
        streamingPollingUri,
        "get",
    );
    const twitchPollingCheermotesConnection = new PollingClientIdConnection<IPollingCheermotesResponse>(
        rootLogger,
        config.twitchAppClientId,
        config.bottenNappetCheermotesPollingInterval,
        true,
        cheermotesPollingUri,
        "get",
    );

    const connectables: IConnectable[] = [
        twitchPollingFollowingConnection,
        twitchPollingStreamingConnection,
        twitchPollingCheermotesConnection,
    ];

    await Bluebird.map(connectables, async (connectable) => connectable.connect());

    backendTwitchPollingAuthenticatedApplicationApiLogger.info("Connected.");

    const disconnect = async (incomingError?: Error) => {
        await Bluebird.map(connectables, async (connectable) => {
            try {
                connectable.disconnect();
            } catch (error) {
                backendTwitchPollingAuthenticatedApplicationApiLogger
                    .error(error, connectable, "Swallowed error while disconnecting.");
            }
        });

        if (incomingError) {
            backendTwitchPollingAuthenticatedApplicationApiLogger.error(incomingError, "Disconnected.");

            throw incomingError;
        }

        backendTwitchPollingAuthenticatedApplicationApiLogger.info("Disconnected.");

        return undefined;
    };

    try {
        await twitchPerUserPollingApi(
            config,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            twitchPollingFollowingConnection,
            twitchPollingStreamingConnection,
            twitchPollingCheermotesConnection,
            twitchUserId,
        );

        await disconnect();
    } catch (error) {
        disconnect(error);
    }
}
