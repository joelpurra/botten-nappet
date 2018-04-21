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

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/config";
import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/src/message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "@botten-nappet/shared/src/message-queue/single-item-topics-subscriber";

import TwitchIrcConnection from "@botten-nappet/backend-twitch/src/irc/connection/irc-connection";
import ITwitchIncomingIrcCommand from "@botten-nappet/backend-twitch/src/irc/interface/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "@botten-nappet/backend-twitch/src/irc/interface/ioutgoing-irc-command";

import {
    UserAccessTokenProviderType,
} from "@botten-nappet/backend-twitch/src/authentication/provider-types";

import TwitchPerUserIrcApi from "./per-user-irc-api";

/* tslint:enable:max-line-length */

export default class BackendTwitchIrcAuthenticatedApplicationApi implements IStartableStoppable {
    private twitchPerUserIrcApi: TwitchPerUserIrcApi | null;
    private connectables: IConnectable[];
    private logger: PinoLogger;

    constructor(
        private readonly config: BackendConfig,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private readonly twitchUserAccessTokenProvider: UserAccessTokenProviderType,
        private readonly twitchUserId: number,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

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

        this.twitchPerUserIrcApi = new TwitchPerUserIrcApi(
            this.config,
            this.logger,
            this.gracefulShutdownManager,
            this.messageQueuePublisher,
            twitchIrcConnection,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
            this.twitchUserId,
        );

        await this.twitchPerUserIrcApi.start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.twitchPerUserIrcApi) {
            await this.twitchPerUserIrcApi.stop();
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
