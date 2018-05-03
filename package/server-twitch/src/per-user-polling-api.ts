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

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";
import SharedConfig from "@botten-nappet/shared/src/config/shared-config";
import GracefulShutdownManager from "@botten-nappet/shared/src/util/graceful-shutdown-manager";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import MessageQueuePublisher from "@botten-nappet/shared/src/message-queue/publisher";
import MessageQueueTopicPublisher from "@botten-nappet/shared/src/message-queue/topic-publisher";

import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/src/interface/response/polling/icheermotes-polling-response";
import IPollingFollowingResponse from "@botten-nappet/backend-twitch/src/interface/response/polling/ifollowing-polling-response";
import IPollingStreamingResponse from "@botten-nappet/backend-twitch/src/interface/response/polling/istreaming-polling-response";
import PollingClientIdConnection from "@botten-nappet/backend-twitch/src/polling/connection/polling-clientid-connection";

import IncomingCheermotesCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-cheermotes-event-translator";
import IncomingFollowingCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-following-event-translator";
import IncomingStreamingCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-streaming-event-translator";

import IIncomingCheermotesEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheermotes-event";
import IIncomingFollowingEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-following-event";
import IIncomingStreamingEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-streaming-event";

/* tslint:enable max-line-length */

export default class TwitchPerUserPollingApi {
    private startables: IStartableStoppable[];
    private logger: PinoLogger;

    constructor(
        private readonly backendConfig: BackendConfig,
        private readonly sharedConfig: SharedConfig,
        logger: PinoLogger,
        private readonly gracefulShutdownManager: GracefulShutdownManager,
        private readonly messageQueuePublisher: MessageQueuePublisher,
        private twitchPollingFollowingConnection: PollingClientIdConnection<IPollingFollowingResponse>,
        private twitchPollingStreamingConnection: PollingClientIdConnection<IPollingStreamingResponse>,
        private twitchPollingCheermotesConnection: PollingClientIdConnection<IPollingCheermotesResponse>,
        private readonly messageQueueTopicPublisherForIIncomingFollowingEvent:
            MessageQueueTopicPublisher<IIncomingFollowingEvent>,
        private readonly messageQueueTopicPublisherForIIncomingStreamingEvent:
            MessageQueueTopicPublisher<IIncomingStreamingEvent>,
        private readonly messageQueueTopicPublisherForIIncomingCheermotesEvent:
            MessageQueueTopicPublisher<IIncomingCheermotesEvent>,
        private readonly twitchUserId: number,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.startables = [];
    }

    public async start(): Promise<void> {

        const twitchIncomingFollowingCommandEventTranslator = new IncomingFollowingCommandEventTranslator(
            this.logger,
            this.twitchPollingFollowingConnection,
            this.messageQueueTopicPublisherForIIncomingFollowingEvent,
            this.backendConfig.twitchUserName,
            this.twitchUserId,
        );

        const twitchIncomingStreamingCommandEventTranslator = new IncomingStreamingCommandEventTranslator(
            this.logger,
            this.twitchPollingStreamingConnection,
            this.messageQueueTopicPublisherForIIncomingStreamingEvent,
            this.backendConfig.twitchUserName,
            this.twitchUserId,
        );

        const twitchIncomingCheermotesCommandEventTranslator = new IncomingCheermotesCommandEventTranslator(
            this.logger,
            this.twitchPollingCheermotesConnection,
            this.messageQueueTopicPublisherForIIncomingCheermotesEvent,
            this.backendConfig.twitchUserName,
            this.twitchUserId,
        );

        this.startables.push(twitchIncomingFollowingCommandEventTranslator);
        this.startables.push(twitchIncomingStreamingCommandEventTranslator);
        this.startables.push(twitchIncomingCheermotesCommandEventTranslator);

        await Bluebird.map(this.startables, async (startable) => startable.start());

        this.logger.info({
            twitchUserId: this.twitchUserId,
            twitchUserName: this.backendConfig.twitchUserName,
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
