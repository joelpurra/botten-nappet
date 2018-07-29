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
    asrt,
} from "@botten-nappet/shared/src/util/asrt";

import AggregateConnectablesManager from "@botten-nappet/shared/src/connection/aggregate-connectables-manager";
import ConnectablesManager from "@botten-nappet/shared/src/connection/connectables-manager";
import StartablesManager from "@botten-nappet/shared/src/startable-stoppable/startables-manager";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import ApplicationAuthenticationEventTranslator from "@botten-nappet/backend-twitch/src/translator/application-authentication-event-translator";
import ApplicationUnauthenticationEventTranslator from "@botten-nappet/backend-twitch/src/translator/application-unauthentication-event-translator";
import ApplicationAuthenticationEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/application-authentication-event-single-item-json-topics-subscriber";
import ApplicationUnauthenticationEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/application-unauthentication-event-single-item-json-topics-subscriber";

import ApplicationAuthenticatedEventTranslator from "@botten-nappet/backend-shared/src/translator/application-authenticated-event-translator";
import ApplicationUnauthenticatedEventTranslator from "@botten-nappet/backend-shared/src/translator/application-unauthenticated-event-translator";
import UserAuthenticationEventTranslator from "@botten-nappet/backend-twitch/src/translator/user-authentication-event-translator";
import UserUnauthenticationEventTranslator from "@botten-nappet/backend-twitch/src/translator/user-unauthentication-event-translator";

import ApplicationAuthenticatedEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/application-authenticated-event-single-item-json-topics-subscriber";
import ApplicationUnauthenticatedEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/application-unauthenticated-event-single-item-json-topics-subscriber";
import OutgoingApplicationAuthenticationCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-outgoing-application-authentication-command-single-item-json-topics-subscriber";
import OutgoingApplicationUnauthenticationCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-outgoing-application-unauthentication-command-single-item-json-topics-subscriber";
import OutgoingUserAuthenticationCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-outgoing-user-authentication-command-single-item-json-topics-subscriber";
import OutgoingUserUnauthenticationCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-outgoing-user-unauthentication-command-single-item-json-topics-subscriber";
import UserAuthenticatedEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/user-authenticated-event-single-item-json-topics-subscriber";
import UserAuthenticationEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/user-authentication-event-single-item-json-topics-subscriber";
import UserUnauthenticatedEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/user-unauthenticated-event-single-item-json-topics-subscriber";
import UserUnauthenticationEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/user-unauthentication-event-single-item-json-topics-subscriber";
import ApplicationAuthenticationHandler from "@botten-nappet/server-twitch/src/handler/application-authentication-handler";
import UserAuthenticationHandler from "@botten-nappet/server-twitch/src/handler/user-authentication-handler";

/* tslint:enable:max-line-length */

@asrt(21)
export default class TwitchAuthenticatedApplicationMain extends StartablesManager {
    protected readonly logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() @scoped(ApplicationAuthenticationEventTranslator)
        private readonly applicationAuthenticationEventTranslator:
            ApplicationAuthenticationEventTranslator,
        @asrt() @scoped(ApplicationUnauthenticationEventTranslator)
        private readonly applicationUnauthenticationEventTranslator:
            ApplicationUnauthenticationEventTranslator,
        @asrt() @scoped(ApplicationAuthenticatedEventTranslator)
        private readonly applicationAuthenticatedEventTranslator:
            ApplicationAuthenticatedEventTranslator,
        @asrt() @scoped(ApplicationUnauthenticatedEventTranslator)
        private readonly applicationUnauthenticatedEventTranslator:
            ApplicationUnauthenticatedEventTranslator,
        @asrt() @scoped(UserAuthenticationEventTranslator)
        private readonly userAuthenticationEventTranslator:
            UserAuthenticationEventTranslator,
        @asrt() @scoped(UserUnauthenticationEventTranslator)
        private readonly userUnauthenticationEventTranslator:
            UserUnauthenticationEventTranslator,
        // @asrt() @scoped(UserAuthenticatedEventTranslator)
        // private readonly userAuthenticatedEventTranslator:
        //     UserAuthenticatedEventTranslator,
        // @asrt() @scoped(UserUnauthenticatedEventTranslator)
        // private readonly userUnauthenticatedEventTranslator:
        //     UserUnauthenticatedEventTranslator,
        @asrt() @scoped(ApplicationAuthenticationHandler)
        private readonly applicationAuthenticationHandler:
            ApplicationAuthenticationHandler,
        @asrt() @scoped(UserAuthenticationHandler)
        private readonly userAuthenticationHandler:
            UserAuthenticationHandler,
        @asrt() @scoped(ApplicationAuthenticationEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIApplicationAuthenticationEvent:
            ApplicationAuthenticationEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(ApplicationUnauthenticationEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIApplicationUnauthenticationEvent:
            ApplicationUnauthenticationEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(ApplicationAuthenticatedEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIApplicationAuthenticatedEvent:
            ApplicationAuthenticatedEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(ApplicationUnauthenticatedEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIApplicationUnauthenticatedEvent:
            ApplicationUnauthenticatedEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(UserAuthenticationEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIUserAuthenticationEvent:
            UserAuthenticationEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(UserUnauthenticationEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIUserUnauthenticationEvent:
            UserUnauthenticationEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(UserAuthenticatedEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIUserAuthenticatedEvent:
            UserAuthenticatedEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(UserUnauthenticatedEventSingleItemJsonTopicsSubscriber)
        private readonly messageQueueSingleItemJsonTopicsSubscriberForIUserUnauthenticatedEvent:
            UserUnauthenticatedEventSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(OutgoingApplicationAuthenticationCommandSingleItemJsonTopicsSubscriber)
        private readonly outgoingApplicationAuthenticationCommandSingleItemJsonTopicsSubscriber:
            OutgoingApplicationAuthenticationCommandSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(OutgoingApplicationUnauthenticationCommandSingleItemJsonTopicsSubscriber)
        private readonly outgoingApplicationUnauthenticationCommandSingleItemJsonTopicsSubscriber:
            OutgoingApplicationUnauthenticationCommandSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(OutgoingUserAuthenticationCommandSingleItemJsonTopicsSubscriber)
        private readonly outgoingUserAuthenticationCommandSingleItemJsonTopicsSubscriber:
            OutgoingUserAuthenticationCommandSingleItemJsonTopicsSubscriber,
        @asrt() @scoped(OutgoingUserUnauthenticationCommandSingleItemJsonTopicsSubscriber)
        private readonly outgoingUserUnauthenticationCommandSingleItemJsonTopicsSubscriber:
            OutgoingUserUnauthenticationCommandSingleItemJsonTopicsSubscriber,
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
                    this.messageQueueSingleItemJsonTopicsSubscriberForIApplicationAuthenticationEvent,
                    this.messageQueueSingleItemJsonTopicsSubscriberForIApplicationUnauthenticationEvent,
                    this.messageQueueSingleItemJsonTopicsSubscriberForIApplicationAuthenticatedEvent,
                    this.messageQueueSingleItemJsonTopicsSubscriberForIApplicationUnauthenticatedEvent,

                    this.messageQueueSingleItemJsonTopicsSubscriberForIUserAuthenticationEvent,
                    this.messageQueueSingleItemJsonTopicsSubscriberForIUserUnauthenticationEvent,
                    this.messageQueueSingleItemJsonTopicsSubscriberForIUserAuthenticatedEvent,
                    this.messageQueueSingleItemJsonTopicsSubscriberForIUserUnauthenticatedEvent,

                    this.outgoingApplicationAuthenticationCommandSingleItemJsonTopicsSubscriber,
                    this.outgoingApplicationUnauthenticationCommandSingleItemJsonTopicsSubscriber,

                    this.outgoingUserAuthenticationCommandSingleItemJsonTopicsSubscriber,
                    this.outgoingUserUnauthenticationCommandSingleItemJsonTopicsSubscriber,
                ],
            ),
        );

        this.startables.push(connectablesManager);

        // TODO: register unauthentication after the authentication even has been
        // triggered to automatically scope context variables?
        this.startables.push(this.applicationAuthenticationEventTranslator);
        this.startables.push(this.applicationUnauthenticationEventTranslator);

        // TODO: register unauthenticated after the authenticated even has been
        // triggered to automatically scope context variables?
        this.startables.push(this.applicationAuthenticatedEventTranslator);
        this.startables.push(this.applicationUnauthenticatedEventTranslator);

        // TODO: register unauthentication after the authentication even has been
        // triggered to automatically scope context variables?
        // TODO: move to user context/scope?
        this.startables.push(this.userAuthenticationEventTranslator);
        this.startables.push(this.userUnauthenticationEventTranslator);

        // // TODO: register unauthenticated after the authenticated even has been
        // // triggered to automatically scope context variables?
        // // TODO: move to user context/scope?
        // this.startables.push(await this.userAuthenticatedEventTranslator);
        // this.startables.push(await this.userUnauthenticatedEventTranslator);

        this.startables.push(this.applicationAuthenticationHandler);

        this.startables.push(this.userAuthenticationHandler);
    }

    @asrt(0)
    public async selfStart(): Promise<void> {
        // NOTE: empty.
    }

    @asrt(0)
    public async  selfStop(): Promise<void> {
        // NOTE: empty.
    }
}
