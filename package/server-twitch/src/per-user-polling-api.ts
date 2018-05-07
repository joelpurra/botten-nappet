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
    within,
} from "@botten-nappet/backend-shared/lib/dependency-injection/within/within";
import Bluebird from "bluebird";

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import MessageQueueTopicPublisher from "@botten-nappet/shared/src/message-queue/topic-publisher";

import IncomingCheermotesCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-cheermotes-event-translator";
import IncomingFollowingCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-following-event-translator";
import IncomingStreamingCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-streaming-event-translator";

import TwitchUserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import TwitchUserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";
import IIncomingCheermotesEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-following-event";
import IIncomingStreamingEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-streaming-event";

/* tslint:enable max-line-length */

export default class TwitchPerUserPollingApi {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        @scoped(IncomingFollowingCommandEventTranslator)
        private readonly twitchIncomingFollowingCommandEventTranslator: IncomingFollowingCommandEventTranslator,
        @scoped(IncomingStreamingCommandEventTranslator)
        private readonly twitchIncomingStreamingCommandEventTranslator: IncomingStreamingCommandEventTranslator,
        @scoped(IncomingCheermotesCommandEventTranslator)
        private readonly twitchIncomingCheermotesCommandEventTranslator: IncomingCheermotesCommandEventTranslator,
        @within(TwitchUserNameProvider, "PerUserHandlersMain")
        private readonly twitchUserNameProvider: TwitchUserNameProvider,
        @within(TwitchUserIdProvider, "PerUserHandlersMain")
        private readonly twitchUserIdProvider: TwitchUserIdProvider,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    public async start(): Promise<void> {
        this.startables.push(this.twitchIncomingFollowingCommandEventTranslator);
        this.startables.push(this.twitchIncomingStreamingCommandEventTranslator);
        this.startables.push(this.twitchIncomingCheermotesCommandEventTranslator);

        await Bluebird.map(this.startables, async (startable) => startable.start());

        this.logger.info({
            twitchUserId: await this.twitchUserIdProvider.get(),
            twitchUserName: await this.twitchUserNameProvider.get(),
        }, "Started listening to events");

        await this.gracefulShutdownManager.waitForShutdownSignal();
    }

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
