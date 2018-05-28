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

/* tslint:disable max-line-length */

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import UserAuthenticationHandlerBase from "./user-authentication-handler-base";

import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";
import UserAuthenticatedEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/user-authenticated-event-topic-publisher";
import UserUnauthenticatedEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/user-unauthenticated-event-topic-publisher";
import TwitchOutgoingUserAuthenticationCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-outgoing-user-authentication-command-single-item-json-topics-subscriber";
import TwitchOutgoingUserUnauthenticationCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-outgoing-user-unauthentication-command-single-item-json-topics-subscriber";

import PerUserHandlersMain from "../per-user-handlers-main";

/* tslint:enable max-line-length */

@asrt(8)
@autoinject
export default abstract class UserAuthenticationHandler extends UserAuthenticationHandlerBase {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() outgoingUserAuthenticationCommandSubscriptionConnection:
            TwitchOutgoingUserAuthenticationCommandSingleItemJsonTopicsSubscriber,
        @asrt() outgoingUserUnauthenticationCommandSubscriptionConnection:
            TwitchOutgoingUserUnauthenticationCommandSingleItemJsonTopicsSubscriber,
        @asrt() incomingUserAuthenticationEvent: UserAuthenticatedEventTopicPublisher,
        @asrt() incomingUserUnauthenticationEvent: UserUnauthenticatedEventTopicPublisher,
        @asrt() userIdProvider: UserIdProvider,
        // @context(PerUserHandlersMain, "PerUserHandlersMain")
        // @asrt() perUserHandlersMain: () => PerUserHandlersMain,
        @asrt() perUserHandlersMain: PerUserHandlersMain,
        @asrt() applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        super(
            logger,
            [
                outgoingUserAuthenticationCommandSubscriptionConnection,
                outgoingUserUnauthenticationCommandSubscriptionConnection,
            ],
            incomingUserAuthenticationEvent,
            incomingUserUnauthenticationEvent,
            applicationTokenManagerConfig,
            userIdProvider,
            perUserHandlersMain,
        );

        this.logger = logger.child(this.constructor.name);
    }
}
