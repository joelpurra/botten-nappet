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

import MessageQueuePublisher from "@botten-nappet/shared/message-queue/publisher";

import {
    UserAccessTokenProviderType,
} from "@botten-nappet/backend-twitch/authentication/provider-types";

import TwitchPubSubConnection from "@botten-nappet/backend-twitch/pubsub/connection/pubsub-connection";

import TwitchPerUserPubSubApi from "./twitch-per-user-pubsub-api";

export default class BackendTwitchPubSubAuthenticatedApplicationApi implements IStartableStoppable {
    private twitchPerUserPubSubApi: TwitchPerUserPubSubApi | null;
    private connectables: IConnectable[];
    private logger: PinoLogger;

    constructor(
        private readonly config: Config,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private readonly twitchUserAccessTokenProvider: UserAccessTokenProviderType,
        private readonly twitchUserId: number,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.twitchPerUserPubSubApi = null;
        this.connectables = [];
    }

    public async start(): Promise<void> {
        const allPubSubTopicsForTwitchUserId = [
            `channel-bits-events-v1.${this.twitchUserId}`,
            `channel-subscribe-events-v1.${this.twitchUserId}`,
            `channel-commerce-events-v1.${this.twitchUserId}`,
            `whispers.${this.twitchUserId}`,
        ];

        const twitchAllPubSubTopicsForTwitchUserIdConnection = new TwitchPubSubConnection(
            this.logger,
            this.config.twitchPubSubWebSocketUri,
            allPubSubTopicsForTwitchUserId,
            this.twitchUserAccessTokenProvider,
        );
        this.connectables.push(twitchAllPubSubTopicsForTwitchUserIdConnection);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        this.twitchPerUserPubSubApi = new TwitchPerUserPubSubApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchAllPubSubTopicsForTwitchUserIdConnection,
            this.twitchUserId,
        );

        await this.twitchPerUserPubSubApi.start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.twitchPerUserPubSubApi) {
            this.twitchPerUserPubSubApi.stop();
        }

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