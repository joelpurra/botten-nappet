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
import {
    assert,
} from "check-types";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";
import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import TwitchIrcConnection from "@botten-nappet/backend-twitch/src/irc/connection/irc-connection";

import IncomingIrcCommandTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-irc-command-topic-publisher";
import IncomingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-irc-command-single-item-json-topics-subscriber";
import OutgoingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/outgoing-irc-command-single-item-json-topics-subscriber";

import TwitchPerUserIrcApi from "./per-user-irc-api";

/* tslint:enable:max-line-length */

export default class BackendTwitchIrcAuthenticatedApplicationApi implements IStartableStoppable {
    private connectables: IConnectable[];
    private logger: PinoLogger;

    constructor(
        @context(TwitchPerUserIrcApi, "TwitchPerUserIrcApi")
        private readonly twitchPerUserIrcApi: () => TwitchPerUserIrcApi,
        logger: PinoLogger,
        @scoped(TwitchIrcConnection)
        private readonly twitchIrcConnection: TwitchIrcConnection,
        // private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand:
        //     IncomingIrcCommandSingleItemJsonTopicsSubscriber,
        @scoped(OutgoingIrcCommandSingleItemJsonTopicsSubscriber)
        private readonly twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand:
            OutgoingIrcCommandSingleItemJsonTopicsSubscriber,
    ) {
        assert.hasLength(arguments, 4);
        assert.equal(typeof twitchPerUserIrcApi, "function");
        assert.equal(typeof logger, "object");
        assert.equal(typeof twitchIrcConnection, "object");
        assert.equal(typeof twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand, "object");

        this.logger = logger.child(this.constructor.name);

        this.connectables = [];
    }

    public async start(): Promise<void> {
        assert.hasLength(this.connectables, 0);

        this.connectables.push(this.twitchIrcConnection);
        this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchOutgoingIrcCommand);

        // TODO: decide where the subscriber gets connected, preferably in an automated fashion.
        // this.connectables.push(this.twitchMessageQueueSingleItemJsonTopicsSubscriberForITwitchIncomingIrcCommand);

        await Bluebird.map(this.connectables, async (connectable) => connectable.connect());

        this.logger.info("Connected.");

        await this.twitchPerUserIrcApi().start();
    }

    public async stop(): Promise<void> {
        // TODO: better cleanup handling.
        // TODO: check if each of these have been started successfully.
        // TODO: better null handling.
        if (this.twitchPerUserIrcApi) {
            await this.twitchPerUserIrcApi().stop();
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