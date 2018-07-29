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
    asrt,
} from "@botten-nappet/shared/src/util/asrt";

import AggregateConnectablesManager from "@botten-nappet/shared/src/connection/aggregate-connectables-manager";
import ConnectablesManager from "@botten-nappet/shared/src/connection/connectables-manager";
import StartablesManager from "@botten-nappet/shared/src/startable-stoppable/startables-manager";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import TwitchPubSubConnection from "@botten-nappet/backend-twitch/src/pubsub/connection/pubsub-connection";

import TwitchPerUserPubSubApi from "@botten-nappet/server-twitch/src/pubsub/per-user-pubsub-api";

@asrt(3)
export default class BackendTwitchPubSubAuthenticatedApplicationApi extends StartablesManager {
    protected readonly logger: PinoLogger;

    constructor(
        @asrt() @context(TwitchPerUserPubSubApi, "TwitchPerUserPubSubApi")
        private readonly twitchPerUserPubSubApi: () => TwitchPerUserPubSubApi,
        @asrt() logger: PinoLogger,
        @asrt() @scoped(TwitchPubSubConnection)
        private readonly twitchAllPubSubTopicsForTwitchUserIdConnection: TwitchPubSubConnection,
    ) {
        super();

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async loadStartables(): Promise<void> {
        const connectablesManager = new ConnectablesManager(
            this.logger,
            new AggregateConnectablesManager(
                this.logger,
                [
                    this.twitchAllPubSubTopicsForTwitchUserIdConnection,
                ],
            ),
        );

        this.startables.push(connectablesManager);
        this.startables.push(this.twitchPerUserPubSubApi());
    }

    @asrt(0)
    public async managedStart(): Promise<void> {
        // NOTE: empty.
    }

    @asrt(0)
    public async managedStop(): Promise<void> {
        // NOTE: empty.
    }
}
