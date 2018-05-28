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
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
import {
    autoinject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IIncomingStreamingEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-streaming-event";

/* tslint:disable:max-line-length */

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import UserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";
import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";
import IncomingStreamingEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-incoming-streaming-event-topic-publisher";
import StreamingResponsePollingClientIdConnection from "@botten-nappet/server-twitch/src/polling-connection/streaming-response-polling-clientid-connection";
import IPollingStreamingResponse from "../interface/response/polling/istreaming-polling-response";
import PollingManager from "../polling/connection/polling-manager";

/* tslint:enable:max-line-length */

@asrt(6)
@autoinject
export default class IncomingStreamingCommandEventTranslator extends PollingManager<IPollingStreamingResponse> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: StreamingResponsePollingClientIdConnection,
        @asrt() private readonly incomingStreamingEventEmitter: IncomingStreamingEventTopicPublisher,
        @asrt() private readonly userNameProvider: UserNameProvider,
        @asrt() private readonly userIdProvider: UserIdProvider,
        @asrt() private readonly applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IPollingStreamingResponse,
    ): Promise<void> {
        data.data.forEach(async (streamEvent) => {
            const userId = parseInt(streamEvent.user_id, 10);

            const classUserId = await this.userIdProvider.get();
            assert.equal(classUserId, userId);

            const username = await this.userNameProvider.get();

            const event: IIncomingStreamingEvent = {
                application: {
                    // TODO: create a class/builder for the twitch application object.
                    id: this.applicationTokenManagerConfig.appClientId,
                    name: "twitch",
                },
                channel: {
                    id: userId,
                    name: username,
                },
                data: {
                    startedAt: streamEvent.started_at,
                    // TODO: move upwards in the object creation chain?
                    title: streamEvent.title,
                    type: streamEvent.type,
                    viewers: streamEvent.viewer_count,
                },
                interfaceName: "IIncomingStreamingEvent",
                timestamp: new Date(),
            };

            this.incomingStreamingEventEmitter.emit(event);
        });
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IPollingStreamingResponse,
    ): Promise<boolean> {
        if (typeof data !== "object") {
            return false;
        }

        if (!Array.isArray(data.data)) {
            return false;
        }

        return true;
    }
}
