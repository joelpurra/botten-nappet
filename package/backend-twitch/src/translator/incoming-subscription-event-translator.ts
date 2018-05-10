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
    autoinject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";

import IIncomingSubscriptionEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-subscription-event";

/* tslint:disable:max-line-length */

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import UserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";
import IIncomingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/iincoming-irc-command";
import IncomingSubscriptionEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-subscription-event-topic-publisher";
import IncomingIrcCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/incoming-irc-command-single-item-json-topics-subscriber";

/* tslint:enable:max-line-length */

@autoinject
export default class IncomingSubscriptionCommandEventTranslator extends EventSubscriptionManager<IIncomingIrcCommand> {
    constructor(
        logger: PinoLogger,
        connection: IncomingIrcCommandSingleItemJsonTopicsSubscriber,
        private readonly incomingSubscriptionEventEmitter: IncomingSubscriptionEventTopicPublisher,
        private readonly userNameProvider: UserNameProvider,
        private readonly userIdProvider: UserIdProvider,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingSubscriptionEventEmitter, "object");
        assert.equal(typeof userNameProvider, "object");
        assert.equal(typeof userIdProvider, "object");

        this.logger = logger.child(this.constructor.name);
    }

    protected async dataHandler(data: IIncomingIrcCommand): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");
        assert.equal(typeof data.tags, "object");

        const tags = data.tags!;
        const username = tags.login;
        // NOTE: contains sub/resub.
        // const msgId = tags["msg-id"];
        const msgParamMonths = parseInt(tags["msg-param-months"], 10);
        const months = !isNaN(msgParamMonths) && msgParamMonths >= 0 ? msgParamMonths : 0;
        const userId = parseInt(data.tags!["user-id"], 10);

        const event: IIncomingSubscriptionEvent = {
            channel: {
                id: await this.userIdProvider.get(),
                name: await this.userNameProvider.get(),
            },
            message: data.message,
            months,
            timestamp: data.timestamp,
            triggerer: {
                id: userId,
                name: username,
            },
        };

        this.incomingSubscriptionEventEmitter.emit(event);
    }

    protected async filter(data: IIncomingIrcCommand): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (data.command !== "USERNOTICE") {
            return false;
        }

        const tags = data.tags;

        if (tags === null) {
            return false;
        }

        if (typeof tags !== "object") {
            return false;
        }

        const msgId = tags["msg-id"];

        if (typeof msgId !== "string") {
            return false;
        }

        if (msgId !== "sub" && msgId !== "resub") {
            return false;
        }

        return true;
    }
}
