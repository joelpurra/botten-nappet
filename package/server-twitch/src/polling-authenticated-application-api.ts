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
    context,
} from "@botten-nappet/backend-shared/lib/dependency-injection/context/context";
import {
    scoped,
} from "@botten-nappet/backend-shared/lib/dependency-injection/scoped/scoped";
import {
    Container,
} from "aurelia-framework";
import Bluebird from "bluebird";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import PollingClientIdConnection from "@botten-nappet/backend-twitch/src/polling/connection/polling-clientid-connection";

import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/src/interface/response/polling/icheermotes-polling-response";
import IPollingFollowingResponse from "@botten-nappet/backend-twitch/src/interface/response/polling/ifollowing-polling-response";
import IPollingStreamingResponse from "@botten-nappet/backend-twitch/src/interface/response/polling/istreaming-polling-response";

import CheermotesResponsePollingClientIdConnection from "@botten-nappet/server-twitch/src/polling-connection/cheermotes-response-polling-clientid-connection";
import FollowingResponsePollingClientIdConnection from "@botten-nappet/server-twitch/src/polling-connection/following-response-polling-clientid-connection";
import StreamingResponsePollingClientIdConnection from "@botten-nappet/server-twitch/src/polling-connection/streaming-response-polling-clientid-connection";

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import TwitchPerUserPollingApi from "./per-user-polling-api";

/* tslint:enable:max-line-length */

export default class BackendTwitchPollingAuthenticatedApplicationApi implements IStartableStoppable {
    private connectables: IConnectable[];
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        private readonly userIdProvider: UserIdProvider,
        @scoped(CheermotesResponsePollingClientIdConnection)
        private readonly twitchPollingCheermotesConnection: CheermotesResponsePollingClientIdConnection,
        @scoped(StreamingResponsePollingClientIdConnection)
        private readonly twitchPollingStreamingConnection: StreamingResponsePollingClientIdConnection,
        @scoped(FollowingResponsePollingClientIdConnection)
        private readonly twitchPollingFollowingConnection: FollowingResponsePollingClientIdConnection,
        @context(TwitchPerUserPollingApi, "TwitchPerUserPollingApi")
        private readonly twitchPerUserPollingApi: TwitchPerUserPollingApi,
        private readonly container: Container,
    ) {
        // TODO DEBUG REMOVE
        console.log(this.constructor.name, "container === container.root", container === container.root);
        console.log(this.constructor.name, "container.parent === container.root", container.parent === container.root);

        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.connectables = [];
    }

    public async start(): Promise<void> {
        const userId = await this.userIdProvider.get();

        this.connectables.push(this.twitchPollingFollowingConnection);
        this.connectables.push(this.twitchPollingStreamingConnection);
        this.connectables.push(this.twitchPollingCheermotesConnection);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        await this.twitchPerUserPollingApi.start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.twitchPerUserPollingApi) {
            await this.twitchPerUserPollingApi.stop();
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
