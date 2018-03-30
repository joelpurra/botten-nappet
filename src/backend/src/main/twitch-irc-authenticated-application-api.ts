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

import TwitchIrcConnection from "@botten-nappet/backend-twitch/irc/connection/irc-connection";
import ITwitchIncomingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";

import IIncomingPubSubEvent from "@botten-nappet/backend-twitch/pubsub/interface/iincoming-pubsub-event";

import { UserAccessTokenProviderType } from "@botten-nappet/backend-twitch/authentication/provider-types";
import twitchPerUserIrcApi from "./twitch-per-user-irc-api";

/* tslint:enable:max-line-length */

export default async function backendTwitchIrcAuthenticatedApplicationApi(
    config: Config,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchUserAccessTokenProvider: UserAccessTokenProviderType,
    twitchUserId: number,
): Promise<void> {
    const backendTwitchIrcAuthenticatedApplicationApiLogger
        = rootLogger.child("backendTwitchIrcAuthenticatedApplicationApi");

    const twitchIrcConnection = new TwitchIrcConnection(
        rootLogger,
        config.twitchIrcWebSocketUri,
        config.twitchChannelName,
        config.twitchUserName,
        twitchUserAccessTokenProvider,
    );

    // TODO: configurable.
    const topicsStringSeparator = ":";
    const splitTopics = (topicsString: string): string[] => topicsString.split(topicsStringSeparator);

    const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchIncomingIrcCommand),
        );
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchOutgoingIrcCommand>(
            rootLogger,
            config.zmqAddress,
            ...splitTopics(config.topicTwitchOutgoingIrcCommand),
        );

    const connectables: IConnectable[] = [
        twitchIrcConnection,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
    ];

    await Bluebird.map(connectables, async (connectable) => connectable.connect());

    backendTwitchIrcAuthenticatedApplicationApiLogger.info("Connected.");

    const disconnect = async (incomingError?: Error) => {
        await Bluebird.map(connectables, async (connectable) => {
            try {
                connectable.disconnect();
            } catch (error) {
                backendTwitchIrcAuthenticatedApplicationApiLogger
                    .error(error, connectable, "Swallowed error while disconnecting.");
            }
        });

        if (incomingError) {
            backendTwitchIrcAuthenticatedApplicationApiLogger.error(incomingError, "Disconnected.");

            throw incomingError;
        }

        backendTwitchIrcAuthenticatedApplicationApiLogger.info("Disconnected.");

        return undefined;
    };

    try {
        await twitchPerUserIrcApi(
            config,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            twitchIrcConnection,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
            twitchUserId,
        );

        await disconnect();
    } catch (error) {
        disconnect(error);
    }
}
