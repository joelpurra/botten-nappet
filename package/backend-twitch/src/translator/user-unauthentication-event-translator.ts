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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";

/* tslint:disable:max-line-length */

import IOutgoingUserUnauthenticationCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-user-unauthentication-command";
import IUserUnauthenticationEvent from "@botten-nappet/interface-shared/src/event/iuser-unauthentication-event";
import OutgoingUserUnauthenticationCommandTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-outgoing-user-unauthentication-command-topic-publisher";
import UserUnauthenticationEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/user-unauthentication-event-single-item-json-topics-subscriber";

/* tslint:enable:max-line-length */

@asrt(3)
@autoinject
export default class UserUnauthenticationEventTranslator
    extends EventSubscriptionManager<IUserUnauthenticationEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: UserUnauthenticationEventSingleItemJsonTopicsSubscriber,
        @asrt() private readonly outgoingUserAuthenticationCommandEventEmitter:
            OutgoingUserUnauthenticationCommandTopicPublisher,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IUserUnauthenticationEvent,
    ): Promise<void> {
        const event: IOutgoingUserUnauthenticationCommand = {
            application: {
                id: data.application.id,
                name: data.application.name,
            },
            data: null,
            interfaceName: "IOutgoingUserUnauthenticationCommand",
            recipient: {
                id: data.recipient.id,
                name: data.recipient.name,
            },
            timestamp: new Date(),
        };

        this.outgoingUserAuthenticationCommandEventEmitter.emit(event);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IUserUnauthenticationEvent,
    ): Promise<boolean> {
        if (typeof data !== "object") {
            return false;
        }

        if (data.interfaceName !== "IUserUnauthenticationEvent") {
            return false;
        }

        return true;
    }
}
