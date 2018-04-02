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
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/message-queue/single-item-topics-subscriber";

import TwitchIrcConnection from "@botten-nappet/backend-twitch/irc/connection/irc-connection";
import ITwitchIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";

import {
    UserAccessTokenProviderType,
} from "@botten-nappet/backend-twitch/authentication/provider-types";

import TwitchPerUserIrcApi from "./twitch-per-user-irc-api";

/* tslint:enable:max-line-length */

export default class BackendTwitchIrcAuthenticatedApplicationApi implements IStartableStoppable {
    private twitchPerUserIrcApi: TwitchPerUserIrcApi | null;
    private connectables: IConnectable[];
    private twitchUserId: number;
    private twitchUserAccessTokenProvider: UserAccessTokenProviderType;
    private messageQueuePublisher: MessageQueuePublisher;
    private gracefulShutdownManager: GracefulShutdownManager;
    private logger: PinoLogger;
    private config: Config;

    constructor(
        config: Config,
        logger: PinoLogger,
        gracefulShutdownManager: GracefulShutdownManager,
        messageQueuePublisher: MessageQueuePublisher,
        twitchUserAccessTokenProvider: UserAccessTokenProviderType,
        twitchUserId: number,
    ) {
        // TODO: validate arguments.
        this.config = config;
        this.logger = logger.child("BackendTwitchIrcAuthenticatedApplicationApi");
        this.gracefulShutdownManager = gracefulShutdownManager;
        this.messageQueuePublisher = messageQueuePublisher;
        this.twitchUserAccessTokenProvider = twitchUserAccessTokenProvider;
        this.twitchUserId = twitchUserId;

        this.twitchPerUserIrcApi = null;
        this.connectables = [];
    }

    public async start(): Promise<void> {
        const twitchIrcConnection = new TwitchIrcConnection(
            this.logger,
            this.config.twitchIrcWebSocketUri,
            this.config.twitchChannelName,
            this.config.twitchUserName,
            this.twitchUserAccessTokenProvider,
        );

        // TODO: configurable.
        const topicsStringSeparator = ":";
        const splitTopics = (topicsString: string): string[] => topicsString.split(topicsStringSeparator);

        const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand =
            new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchIncomingIrcCommand),
            );
        const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand =
            new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchOutgoingIrcCommand>(
                this.logger,
                this.config.zmqAddress,
                ...splitTopics(this.config.topicTwitchOutgoingIrcCommand),
            );

        this.connectables.push(twitchIrcConnection);
        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand);
        this.connectables.push(twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand);

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

        this.twitchPerUserIrcApi = new TwitchPerUserIrcApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchIrcConnection,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
            this.twitchUserId,
        );

        try {
            await this.twitchPerUserIrcApi.start();

            await disconnect();
        } catch (error) {
            await disconnect(error);
        }
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await this.twitchPerUserIrcApi!.stop();

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
