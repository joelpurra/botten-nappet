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

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import UserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";
import IApplicationUnauthenticatedEvent from "@botten-nappet/interface-shared/src/event/iapplication-unauthenticated-event";
import IUserUnauthenticationEvent from "@botten-nappet/interface-shared/src/event/iuser-unauthentication-event";
import UserUnauthenticationEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/user-unauthentication-event-topic-publisher";
import ApplicationUnauthenticatedEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/application-unauthenticated-event-single-item-json-topics-subscriber";

/* tslint:enable:max-line-length */

@asrt(5)
@autoinject
export default class ApplicationUnauthenticatedEventTranslator
    extends EventSubscriptionManager<IApplicationUnauthenticatedEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: ApplicationUnauthenticatedEventSingleItemJsonTopicsSubscriber,
        @asrt() private readonly outgoingApplicationAuthenticationCommandEventEmitter:
            UserUnauthenticationEventTopicPublisher,
        @asrt() private readonly userIdProvider: UserIdProvider,
        @asrt() private readonly userNameProvider: UserNameProvider,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IApplicationUnauthenticatedEvent,
    ): Promise<void> {
        const event: IUserUnauthenticationEvent = {
            application: {
                id: data.application.id,
                name: data.application.name,
            },
            data: null,
            interfaceName: "IUserUnauthenticationEvent",
            recipient: {
                id: await this.userIdProvider.get(),
                name: await this.userNameProvider.get(),
            },
            timestamp: new Date(),
        };

        this.outgoingApplicationAuthenticationCommandEventEmitter.emit(event);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IApplicationUnauthenticatedEvent,
    ): Promise<boolean> {
        if (typeof data !== "object") {
            return false;
        }

        if (data.interfaceName !== "IApplicationUnauthenticatedEvent") {
            return false;
        }

        return true;
    }
}
