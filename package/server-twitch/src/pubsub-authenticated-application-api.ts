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
import Bluebird from "bluebird";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import TwitchPubSubConnection from "@botten-nappet/backend-twitch/src/pubsub/connection/pubsub-connection";

import TwitchPerUserPubSubApi from "./per-user-pubsub-api";

export default class BackendTwitchPubSubAuthenticatedApplicationApi implements IStartableStoppable {
    private connectables: IConnectable[];
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        @scoped(TwitchPubSubConnection)
        private readonly twitchAllPubSubTopicsForTwitchUserIdConnection: TwitchPubSubConnection,
        @context(TwitchPerUserPubSubApi, "TwitchPerUserPubSubApi")
        private readonly twitchPerUserPubSubApi: TwitchPerUserPubSubApi,
    ) {
        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);

        this.connectables = [];
    }

    public async start(): Promise<void> {
        this.connectables.push(this.twitchAllPubSubTopicsForTwitchUserIdConnection);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        await this.twitchPerUserPubSubApi.start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.twitchPerUserPubSubApi) {
            this.twitchPerUserPubSubApi.stop();
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
