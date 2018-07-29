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
import IncomingIrcCommandTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-incoming-irc-command-topic-publisher";
import OutgoingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-outgoing-irc-command-single-item-json-topics-subscriber";
import StartablesManager from "@botten-nappet/shared/src/startable-stoppable/startables-manager";

/* tslint:enable max-line-length */

@asrt(6)
export default class TwitchPerUserIrcApi extends StartablesManager {
    protected logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly twitchIrcConnection: TwitchIrcConnection,
        @asrt() private twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand:
            OutgoingIrcCommandSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(IncomingIrcCommandTopicPublisher)
        private readonly messageQueueTopicPublisherForIIncomingIrcCommand:
            IncomingIrcCommandTopicPublisher,
        @asrt() private readonly twitchUserNameProvider: TwitchUserNameProvider,
        @asrt() private readonly twitchUserIdProvider: TwitchUserIdProvider,
    ) {
        super();

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async loadStartables(): Promise<void> {
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
    }

    @asrt(0)
    public async selfStart(): Promise<void> {
        this.logger.info({
            twitchUserId: await this.twitchUserIdProvider.get(),
            twitchUserName: await this.twitchUserNameProvider.get(),
        }, "Started listening to events");
    }

    @asrt(0)
    public async selfStop(): Promise<void> {
        // NOTE: empty.
    }
}
