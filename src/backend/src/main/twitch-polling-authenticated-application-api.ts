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
import IStartableStoppable from "@botten-nappet/shared/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/util/pino-logger";
import Config from "../config/config";

/* tslint:disable:max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";

import PollingClientIdConnection from "@botten-nappet/backend-twitch/polling/connection/polling-clientid-connection";

import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/interface/response/polling/icheermotes-polling-response";
import IPollingFollowingResponse from "@botten-nappet/backend-twitch/interface/response/polling/ifollowing-polling-response";
import IPollingStreamingResponse from "@botten-nappet/backend-twitch/interface/response/polling/istreaming-polling-response";

import TwitchPerUserPollingApi from "./twitch-per-user-polling-api";

/* tslint:enable:max-line-length */

export default class BackendTwitchPollingAuthenticatedApplicationApi implements IStartableStoppable {
    private twitchPerUserPollingApi: TwitchPerUserPollingApi | null;
    private connectables: IConnectable[];
    private twitchUserId: number;
    private messageQueuePublisher: MessageQueuePublisher;
    private gracefulShutdownManager: GracefulShutdownManager;
    private logger: PinoLogger;
    private config: Config;

    constructor(
        config: Config,
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        messageQueuePublisher: MessageQueuePublisher,
        twitchUserId: number,
    ) {
        // TODO: validate arguments.
        this.config = config;
        this.logger = logger.child("BackendTwitchPollingAuthenticatedApplicationApi");
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.messageQueuePublisher = messageQueuePublisher;
        this.twitchUserId = twitchUserId;

        this.twitchPerUserPollingApi = null;
        this.connectables = [];
    }

    public async start(): Promise<void> {
        // TODO: externalize/configure base url.
        const followingPollingUri =
            `https://api.twitch.tv/kraken/channels/${
            this.twitchUserId
            }/follows?limit=${
            this.config.followingPollingLimit
            }`;

        // TODO: externalize/configure base url.
        const streamingPollingUri = `https://api.twitch.tv/helix/streams?user_id=${this.twitchUserId}`;

        // TODO: externalize/configure base url.
        const cheermotesPollingUri = `https://api.twitch.tv/kraken/bits/actions?channel_id=${this.twitchUserId}`;

        const twitchPollingFollowingConnection = new PollingClientIdConnection<IPollingFollowingResponse>(
            this.logger,
            this.config.twitchAppClientId,
            this.config.bottenNappetDefaultPollingInterval,
            false,
            followingPollingUri,
            "get",
        );
        const twitchPollingStreamingConnection = new PollingClientIdConnection<IPollingStreamingResponse>(
            this.logger,
            this.config.twitchAppClientId,
            this.config.bottenNappetStreamingPollingInterval,
            true,
            streamingPollingUri,
            "get",
        );
        const twitchPollingCheermotesConnection = new PollingClientIdConnection<IPollingCheermotesResponse>(
            this.logger,
            this.config.twitchAppClientId,
            this.config.bottenNappetCheermotesPollingInterval,
            true,
            cheermotesPollingUri,
            "get",
        );

        this.connectables.push(twitchPollingFollowingConnection);
        this.connectables.push(twitchPollingStreamingConnection);
        this.connectables.push(twitchPollingCheermotesConnection);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        const disconnect = async (incomingError?: Error) => {
            await this.stop();

            if (incomingError) {
                this.logger.error(incomingError, "Disconnected.");

                throw incomingError;
            }

            this.logger.info("Disconnected.");

            return undefined;
        };

        this.twitchPerUserPollingApi = new TwitchPerUserPollingApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchPollingFollowingConnection,
            twitchPollingStreamingConnection,
            twitchPollingCheermotesConnection,
            this.twitchUserId,
        );

        try {
            await this.twitchPerUserPollingApi.start();

            await disconnect();
        } catch (error) {
            await disconnect(error);
        }
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await this.twitchPerUserPollingApi!.stop();

        await Bluebird.map(
            this.connectables,
            async (connectable) => {
                try {
                    await connectable.disconnect();
                } catch (error) {
                    this.logger
                        .error(error, connectable, "Swallowed error while disconnecting.");
                }
            },
        );
    }
}
