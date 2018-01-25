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
// import {
//     assert,
// } from "check-types";

// NOTE: this is a hack, modifying the global Rx.Observable.prototype.
import "../../lib/rxjs-extensions/async-filter";

import fs from "fs";

import configLibrary from "config";
import pino from "pino";

import IConnectable from "../connection/iconnectable";
import IStartableStoppable from "../startable-stoppable/istartable-stoppable";

import Config from "../config/config";
import DatabaseConnection from "../storage/database-connection";
import UserStorageManager from "../storage/manager/user-storage-manager";
import UserRepository from "../storage/repository/user-repository";
import GracefulShutdownManager from "../util/graceful-shutdown-manager";
import PinoLogger from "../util/pino-logger";

import MessageQueuePublisher from "../message-queue/publisher";
import MessageQueueSingleItemJsonTopicsSubscriber from "../message-queue/single-item-topics-subscriber";
import MessageQueueTopicPublisher from "../message-queue/topic-publisher";

import TwitchApplicationTokenManager from "../twitch/authentication/application-token-manager";
import TwitchPollingApplicationTokenConnection from "../twitch/authentication/polling-application-token-connection";
import {
    ApplicationAccessTokenProviderType,
    AugmentedTokenProviderType,
    UserAccessTokenProviderType,
} from "../twitch/authentication/provider-types";
import TwitchUserTokenManager from "../twitch/authentication/user-token-manager";

import TwitchCSRFHelper from "../twitch/helper/csrf-helper";
import TwitchRequestHelper from "../twitch/helper/request-helper";
import TwitchTokenHelper from "../twitch/helper/token-helper";
import TwitchUserHelper from "../twitch/helper/user-helper";
import TwitchUserTokenHelper from "../twitch/helper/user-token-helper";

import ITwitchIncomingIrcCommand from "../twitch/irc/command/iincoming-irc-command";
import ITwitchOutgoingIrcCommand from "../twitch/irc/command/ioutgoing-irc-command";
import TwitchIrcFollowReminderHandler from "../twitch/irc/handler/follow-reminder";
import TwitchIrcGreetingHandler from "../twitch/irc/handler/greeting";
import TwitchIrcLoggingHandler from "../twitch/irc/handler/logging";
import TwitchIrcNewChatterHandler from "../twitch/irc/handler/new-chatter";
import TwitchIrcPingHandler from "../twitch/irc/handler/ping";
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

const createRootLogger = async (config: Config): Promise<PinoLogger> => {
    const logFileStream = fs.createWriteStream(config.loggingFile);
    const rootPinoLogger = pino({
        extreme: true,
        level: config.loggingLevel,
        name: config.applicationName,
        onTerminated: (
            /* tslint:disable:no-unused-variable */
            // eventName,
            // error,
            /* tslint:enable:no-unused-variable */
        ) => {
            // NOTE: override onTerminated to prevent pino from calling process.exit().
        },
    }, logFileStream);

    const logger = new PinoLogger(rootPinoLogger);

    return logger;
};

const perUserHandlersMain = async (
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchIrcConnection: TwitchIrcConnection,
    twitchPollingFollowingConnection: PollingClientIdConnection,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>,
    twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand:
        MessageQueueSingleItemJsonTopicsSubscriber<ITwitchOutgoingIrcCommand>,
    twitchPubSubPingHandler: TwitchPubSubPingHandler,
    twitchPubSubReconnectHandler: TwitchPubSubReconnectHandler,
    twitchPubSubLoggingHandler: TwitchPubSubLoggingHandler,
    twitchUserId: number,
): Promise<void> => {
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

    const twitchIrcLoggingHandler = new TwitchIrcLoggingHandler(rootLogger, twitchIrcConnection);
    const twitchIrcPingHandler = new TwitchIrcPingHandler(rootLogger, twitchIrcConnection);
    const twitchIrcGreetingHandler = new TwitchIrcGreetingHandler(
        rootLogger,
        twitchIrcConnection,
        config.twitchUserName,
    );
    const twitchIrcNewChatterHandler = new TwitchIrcNewChatterHandler(rootLogger, twitchIrcConnection);
    const twitchIrcSubscribingHandler = new TwitchIrcSubscribingHandler(rootLogger, twitchIrcConnection);
    const twitchIrcFollowReminderHandler = new TwitchIrcFollowReminderHandler(rootLogger, twitchIrcConnection);
    const twitchPollingFollowingHandler = new TwitchPollingFollowingHandler(
        rootLogger,
        twitchPollingFollowingConnection,
        twitchIrcConnection,
        config.twitchChannelName,
    );

    const startables: IStartableStoppable[] = [
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
};

const authenticatedApplicationMain = async (
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchApplicationTokenManager: TwitchApplicationTokenManager,
    twitchRequestHelper: TwitchRequestHelper,
    twitchCSRFHelper: TwitchCSRFHelper,
    twitchTokenHelper: TwitchTokenHelper,
): Promise<void> => {
    const twitchApplicationAccessTokenProvider: ApplicationAccessTokenProviderType =
        async () => twitchApplicationTokenManager.getOrWait();

    // TODO: find usage for the TwitchUserHelper.
    const twitchUserHelper = new TwitchUserHelper(
        rootLogger,
        twitchRequestHelper,
        config.twitchUsersDataUri,
        twitchApplicationAccessTokenProvider,
    );

    const userStorageManager = new UserStorageManager(rootLogger, UserRepository);
    const twitchUserTokenHelper = new TwitchUserTokenHelper(
        rootLogger,
        twitchCSRFHelper,
        userStorageManager,
        twitchRequestHelper,
        config.twitchOAuthAuthorizationUri,
        config.twitchAppOAuthRedirectUrl,
        config.twitchOAuthTokenUri,
        config.twitchAppClientId,
        config.twitchAppClientSecret,
    );
    const userTokenManager = new TwitchUserTokenManager(rootLogger, twitchTokenHelper, twitchUserTokenHelper);
    const twitchAugmentedTokenProvider: AugmentedTokenProviderType =
        async () => userTokenManager.get(config.twitchUserName);
    const twitchUserAccessTokenProvider: UserAccessTokenProviderType = async () => {
        const augmentedToken = await twitchAugmentedTokenProvider();

        // TODO: better null handling.
        if (augmentedToken.token === null) {
            throw new Error("augmentedToken.token is null.");
        }

        return augmentedToken.token.access_token;
    };
    const twitchAugmentedToken = await twitchAugmentedTokenProvider();
    const twitchUserRawToken = twitchAugmentedToken.token;
    // TODO: better null handling.
    const twitchUserId = await twitchTokenHelper.getUserIdByRawAccessToken(twitchUserRawToken!);

    const allPubSubTopicsForTwitchUserId = [
        `channel-bits-events-v1.${twitchUserId}`,
        `channel-subscribe-events-v1.${twitchUserId}`,
        `channel-commerce-events-v1.${twitchUserId}`,
        `whispers.${twitchUserId}`,
    ];

    const followingPollingUri =
        `https://api.twitch.tv/kraken/channels/${twitchUserId}/follows?limit=${config.followingPollingLimit}`;
    const twitchAllPubSubTopicsForTwitchUserIdConnection = new TwitchPubSubConnection(
        rootLogger,
        config.twitchPubSubWebSocketUri,
        allPubSubTopicsForTwitchUserId,
        twitchUserAccessTokenProvider,
    );
    const twitchIrcConnection = new TwitchIrcConnection(
        rootLogger,
        config.twitchIrcWebSocketUri,
        config.twitchChannelName,
        config.twitchUserName,
        twitchUserAccessTokenProvider,
    );
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
    const twitchPollingFollowingConnection = new PollingClientIdConnection(
        rootLogger,
        config.twitchAppClientId,
        config.bottenNappetDefaultPollingInterval,
        false,
        followingPollingUri,
        "get",
    );
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchIncomingIrcCommand>(
            rootLogger,
            config.zmqAddress,
            config.topicTwitchIncomingIrcCommand,
        );
    const twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand =
        new MessageQueueSingleItemJsonTopicsSubscriber<ITwitchOutgoingIrcCommand>(
            rootLogger,
            config.zmqAddress,
            config.topicTwitchOutgoingIrcCommand,
        );

    const connectables: IConnectable[] = [
        twitchAllPubSubTopicsForTwitchUserIdConnection,
        twitchIrcConnection,
        twitchPollingFollowingConnection,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
        twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
    ];

    await Bluebird.map(connectables, async (connectable) => connectable.connect());

    mainLogger.info("Connected.");

    const disconnect = async (incomingError?: Error) => {
        await Bluebird.map(connectables, async (connectable) => {
            try {
                connectable.disconnect();
            } catch (error) {
                mainLogger.error(error, connectable, "Swallowed error while disconnecting.");
            }
        });

        if (incomingError) {
            mainLogger.error(incomingError, "Disconnected.");

            throw incomingError;
        }

        mainLogger.info("Disconnected.");

        return undefined;
    };

    try {
        await perUserHandlersMain(
            config,
            mainLogger,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            twitchIrcConnection,
            twitchPollingFollowingConnection,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand,
            twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
            twitchPubSubPingHandler,
            twitchPubSubReconnectHandler,
            twitchPubSubLoggingHandler,
            twitchUserId,
        );

        await disconnect();
    } catch (error) {
        disconnect(error);
    }
};

const managedMain = async (
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    messageQueuePublisher: MessageQueuePublisher,
    twitchRequestHelper: TwitchRequestHelper,
    twitchCSRFHelper: TwitchCSRFHelper ,
    twitchTokenHelper: TwitchTokenHelper ,
    twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
    twitchApplicationTokenManager: TwitchApplicationTokenManager,
): Promise<void> => {
    await twitchPollingApplicationTokenConnection.connect();
    await twitchApplicationTokenManager.start();
    await twitchApplicationTokenManager.getOrWait();

    mainLogger.info("Application authenticated.");

    const disconnectAuthentication = async (incomingError?: Error) => {
        await twitchApplicationTokenManager.stop();
        await twitchPollingApplicationTokenConnection.disconnect();

        if (incomingError) {
            mainLogger.error(incomingError, "Unauthenticated.");

            throw incomingError;
        }

        mainLogger.info("Unauthenticated.");

        return undefined;
    };

    try {
        await authenticatedApplicationMain(
            config,
            mainLogger,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            twitchApplicationTokenManager,
            twitchRequestHelper,
            twitchCSRFHelper,
            twitchTokenHelper,
        );

        await disconnectAuthentication();
    } catch (error) {
        disconnectAuthentication(error);
    }
};

const managerMain = async (
    config: Config,
    mainLogger: PinoLogger,
    rootLogger: PinoLogger,
    gracefulShutdownManager: GracefulShutdownManager,
    databaseConnection: DatabaseConnection,
    messageQueuePublisher: MessageQueuePublisher,
    twitchRequestHelper: TwitchRequestHelper,
    twitchCSRFHelper: TwitchCSRFHelper,
    twitchTokenHelper: TwitchTokenHelper,
    twitchPollingApplicationTokenConnection: TwitchPollingApplicationTokenConnection,
    twitchApplicationTokenManager: TwitchApplicationTokenManager,
) => {
    await gracefulShutdownManager.start();
    await databaseConnection.connect();
    await messageQueuePublisher.connect();

    mainLogger.info("Managed.");

    const shutdown = async (incomingError?: Error) => {
        await messageQueuePublisher.disconnect();
        await databaseConnection.disconnect();
        await gracefulShutdownManager.stop();

        if (incomingError) {
            mainLogger.error(incomingError, "Unmanaged.");

            throw incomingError;
        }

        mainLogger.info("Unmanaged.");

        return undefined;
    };

    try {
        await managedMain(
            config,
            mainLogger,
            rootLogger,
            gracefulShutdownManager,
            messageQueuePublisher,
            twitchRequestHelper,
            twitchCSRFHelper,
            twitchTokenHelper,
            twitchPollingApplicationTokenConnection,
            twitchApplicationTokenManager,
        );

        await shutdown();
    } catch (error) {
        shutdown(error);
    }
};

const main = async (): Promise<void> => {
    const config = new Config(configLibrary);

    config.validate();

    const rootLogger = await createRootLogger(config);

    const mainLogger = rootLogger.child("main");

    const gracefulShutdownManager = new GracefulShutdownManager(rootLogger);
    const databaseConnection = new DatabaseConnection(rootLogger, config.databaseUri);
    const messageQueuePublisher = new MessageQueuePublisher(rootLogger, config.zmqAddress);
    const twitchPollingApplicationTokenConnection = new TwitchPollingApplicationTokenConnection(
        rootLogger,
        config.twitchAppClientId,
        config.twitchAppClientSecret,
        config.twitchAppScopes,
        config.twitchAppTokenRefreshInterval,
        false,
        config.twitchOAuthTokenUri,
        "post",
    );
    const twitchApplicationTokenManager = new TwitchApplicationTokenManager(
        rootLogger,
        twitchPollingApplicationTokenConnection,
        config.twitchAppClientId,
        config.twitchOAuthTokenRevocationUri,
    );
    const twitchCSRFHelper = new TwitchCSRFHelper(rootLogger);
    const twitchRequestHelper = new TwitchRequestHelper(rootLogger);
    const twitchTokenHelper = new TwitchTokenHelper(
        rootLogger,
        twitchRequestHelper,
        config.twitchOAuthTokenRevocationUri,
        config.twitchOAuthTokenVerificationUri,
        config.twitchAppClientId,
    );

    await managerMain(
        config,
        mainLogger,
        rootLogger,
        gracefulShutdownManager,
        databaseConnection,
        messageQueuePublisher,
        twitchRequestHelper,
        twitchCSRFHelper,
        twitchTokenHelper,
        twitchPollingApplicationTokenConnection,
        twitchApplicationTokenManager,
    );
};

const run = async (): Promise<void> => {
    try {
        await main();

        process.exitCode = 0;
    } catch (error) {
        /* tslint:disable:no-console */
        console.error("Error.", error);
        /* tslint:enable:no-console */

        process.exitCode = 1;
    }
};

export default run;
