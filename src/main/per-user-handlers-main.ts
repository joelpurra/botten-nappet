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

import IStartableStoppable from "../startable-stoppable/istartable-stoppable";

import Config from "../config/config";
import GracefulShutdownManager from "../util/graceful-shutdown-manager";
import PinoLogger from "../util/pino-logger";

import MessageQueuePublisher from "../message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "../message-queue/single-item-topics-subscriber";
import MessageQueueTopicPublisher from "../message-queue/topic-publisher";

import ITwitchIncomingIrcCommand from "../twitch/irc/command/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "../twitch/irc/command/ioutgoing-irc-command";
import TwitchIrcFollowReminderHandler from "../twitch/irc/handler/follow-reminder";
import TwitchIrcGreetingHandler from "../twitch/irc/handler/greeting";
import TwitchIrcLoggingHandler from "../twitch/irc/handler/logging";
import TwitchIrcNewChatterHandler from "../twitch/irc/handler/new-chatter";
import TwitchIrcPingHandler from "../twitch/irc/handler/ping";
import TwitchIrcReconnectHandler from "../twitch/irc/handler/reconnect";
import TwitchIrcSubscribingHandler from "../twitch/irc/handler/subscribing";
import TwitchIrcConnection from "../twitch/irc/irc-connection";

import TwitchOutgoingIrcCommandEventEmitter from "../twitch/irc/event-emitter/outgoing-irc-command-event-emitter";
import TwitchIncomingIrcCommandEventTranslator from "../twitch/irc/event-handler/incoming-irc-command-event-translator";
import TwitchOutgoingIrcCommandEventHandler from "../twitch/irc/event-handler/outgoing-irc-command-event-handler";
import TwitchIrcTextResponseCommandHandler from "../twitch/irc/handler/text-response-command";

import PollingClientIdConnection from "../twitch/polling/connection/polling-clientid-connection";
import TwitchPollingFollowingHandler from "../twitch/polling/handler/following";

import TwitchPubSubLoggingHandler from "../twitch/pubsub/handler/logging";
import TwitchPubSubPingHandler from "../twitch/pubsub/handler/ping";
import TwitchPubSubReconnectHandler from "../twitch/pubsub/handler/reconnect";
import TwitchPubSubConnection from "../twitch/pubsub/pubsub-connection";

export default async function perUserHandlersMain(
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchIrcConnection: TwitchIrcConnection,
    twitchPollingFollowingConnection: PollingClientIdConnection,
    twitchAllPubSubTopicsForTwitchUserIdConnection: TwitchPubSubConnection,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<ITwitchOutgoingIrcCommand>,
    twitchUserId: number,
): Promise<void> {
    const twitchPubSubPingHandler = new TwitchPubSubPingHandler(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    );
    const twitchPubSubReconnectHandler = new TwitchPubSubReconnectHandler(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    );
    const twitchPubSubLoggingHandler = new TwitchPubSubLoggingHandler(
        rootLogger,
        twitchAllPubSubTopicsForTwitchUserIdConnection,
    );

    const twitchIrcReconnectHandler = new TwitchIrcReconnectHandler(
        rootLogger,
        twitchIrcConnection,
    );

    const messageQueueTopicPublisherForIIncomingIrcCommand =
        new MessageQueueTopicPublisher<ITwitchIncomingIrcCommand>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchIncomingIrcCommand,
        );

    const messageQueueTopicPublisherForIOutgoingIrcCommand =
        new MessageQueueTopicPublisher<ITwitchOutgoingIrcCommand>(
            rootLogger,
            messageQueuePublisher,
            config.topicTwitchOutgoingIrcCommand,
        );

    const twitchIncomingIrcCommandEventTranslator = new TwitchIncomingIrcCommandEventTranslator(
        rootLogger,
        twitchIrcConnection,
        messageQueueTopicPublisherForIIncomingIrcCommand,
    );

    const twitchOutgoingIrcCommandEventEmitter = new TwitchOutgoingIrcCommandEventEmitter(
        rootLogger,
        messageQueueTopicPublisherForIOutgoingIrcCommand,
    );

    const twitchOutgoingIrcCommandEventHandler = new TwitchOutgoingIrcCommandEventHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
        twitchIrcConnection,
    );

    const twitchIrcTextResponseCommandHandler = new TwitchIrcTextResponseCommandHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchOutgoingIrcCommandEventEmitter,
    );

    const twitchIrcLoggingHandler = new TwitchIrcLoggingHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
    );
    const twitchIrcPingHandler = new TwitchIrcPingHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchOutgoingIrcCommandEventEmitter,
    );
    const twitchIrcGreetingHandler = new TwitchIrcGreetingHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchOutgoingIrcCommandEventEmitter,
        config.twitchUserName,
    );
    const twitchIrcNewChatterHandler = new TwitchIrcNewChatterHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchOutgoingIrcCommandEventEmitter,
    );
    const twitchIrcSubscribingHandler = new TwitchIrcSubscribingHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchOutgoingIrcCommandEventEmitter,
    );
    const twitchIrcFollowReminderHandler = new TwitchIrcFollowReminderHandler(
        rootLogger,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchOutgoingIrcCommandEventEmitter,
        config.twitchChannelName,
    );
    const twitchPollingFollowingHandler = new TwitchPollingFollowingHandler(
        rootLogger,
        twitchPollingFollowingConnection,
        twitchOutgoingIrcCommandEventEmitter,
        config.twitchChannelName,
    );

    const startables: IStartableStoppable[] = [
        twitchIrcReconnectHandler,
        twitchPubSubPingHandler,
        twitchPubSubReconnectHandler,
        twitchPubSubLoggingHandler,
        twitchIrcLoggingHandler,
        twitchIrcPingHandler,
        twitchIrcGreetingHandler,
        twitchIrcNewChatterHandler,
        twitchIrcSubscribingHandler,
        twitchIrcFollowReminderHandler,
        twitchPollingFollowingHandler,
        twitchIncomingIrcCommandEventTranslator,
        twitchOutgoingIrcCommandEventHandler,
        twitchIrcTextResponseCommandHandler,
    ];

    const stop = async (incomingError?: Error) => {
        await Bluebird.map(startables, async (startable) => {
            try {
                startable.stop();
            } catch (error) {
                mainLogger.error(error, startable, "Swallowed error while stopping.");
            }
        });

        if (incomingError) {
            mainLogger.error(incomingError, "Stopped.");

            throw incomingError;
        }

        mainLogger.info("Stopped.");

        return undefined;
    };

    try {
        await Bluebird.map(startables, async (startable) => startable.start());

        mainLogger.info({
            twitchUserId,
            twitchUserName: config.twitchUserName,
        }, "Started listening to events");

        await gracefulShutdownManager.waitForShutdownSignal();

        await stop();
    } catch (error) {
        stop(error);
    }
}
