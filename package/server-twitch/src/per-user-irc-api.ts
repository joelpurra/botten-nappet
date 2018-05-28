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

import {
    scoped,
} from "@botten-nappet/backend-shared/lib/dependency-injection/scoped/scoped";
import {
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
import Bluebird from "bluebird";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import TwitchIrcConnection from "@botten-nappet/backend-twitch/src/irc/connection/irc-connection";
import TwitchIrcLoggingHandler from "@botten-nappet/backend-twitch/src/irc/handler/logging";
import TwitchIrcPingHandler from "@botten-nappet/backend-twitch/src/irc/handler/ping";
import TwitchIrcReconnectHandler from "@botten-nappet/backend-twitch/src/irc/handler/reconnect";

import TwitchUserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import TwitchUserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";
import TwitchIncomingIrcCommandEventTranslator from "@botten-nappet/backend-twitch/src/irc/translator/incoming-irc-command-event-translator";
import TwitchOutgoingIrcCommandEventHandler from "@botten-nappet/backend-twitch/src/irc/translator/outgoing-irc-command-event-handler";
import IncomingIrcCommandTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-irc-command-topic-publisher";
import OutgoingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/outgoing-irc-command-single-item-json-topics-subscriber";

/* tslint:enable max-line-length */

@asrt(7)
export default class TwitchPerUserIrcApi implements IStartableStoppable {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly gracefulShutdownManager: GracefulShutdownManager,
        @asrt() private readonly twitchIrcConnection: TwitchIrcConnection,
        @asrt() private twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand:
            OutgoingIrcCommandSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingIrcCommandTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingIrcCommand:
            IncomingIrcCommandTopicPublisher,
        @asrt() private readonly twitchUserNameProvider: TwitchUserNameProvider,
        @asrt() private readonly twitchUserIdProvider: TwitchUserIdProvider,
    ) {
        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    @asrt(0)
    public async start(): Promise<void> {
        const twitchIrcReconnectHandler = new TwitchIrcReconnectHandler(
            this.logger,
            this.twitchIrcConnection,
        );

        const twitchIncomingIrcCommandEventTranslator = new TwitchIncomingIrcCommandEventTranslator(
            this.logger,
            this.twitchIrcConnection,
            this.messageQueueTopicPublisherForIIncomingIrcCommand,
        );

        const twitchOutgoingIrcCommandEventHandler = new TwitchOutgoingIrcCommandEventHandler(
            this.logger,
            this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand,
            this.twitchIrcConnection,
        );

        const twitchIrcLoggingHandler = new TwitchIrcLoggingHandler(
            this.logger,
            this.twitchIrcConnection,
        );
        const twitchIrcPingHandler = new TwitchIrcPingHandler(
            this.logger,
            this.twitchIrcConnection,
        );

        this.startables.push(twitchIrcReconnectHandler);
        this.startables.push(twitchIrcLoggingHandler);
        this.startables.push(twitchIrcPingHandler);
        this.startables.push(twitchIncomingIrcCommandEventTranslator);
        this.startables.push(twitchOutgoingIrcCommandEventHandler);

        await Bluebird.map(this.startables, async (startable) => startable.start());

        this.logger.info({
            twitchUserId: await this.twitchUserIdProvider.get(),
            twitchUserName: await this.twitchUserNameProvider.get(),
        }, "Started listening to events");

        await this.gracefulShutdownManager.waitForShutdownSignal();
    }

    @asrt(0)
    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        await Bluebird.map(
            this.startables,
            async (startable) => {
                try {
                    await startable.stop();
                } catch (error) {
                    this.logger.error(error, startable, "Swallowed error while stopping.");
                }
            },
        );
    }
}
