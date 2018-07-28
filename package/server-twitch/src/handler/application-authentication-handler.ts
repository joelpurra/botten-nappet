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

import ApplicationTokenManager from "@botten-nappet/backend-twitch/src/authentication/application-token-manager";
import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";

/* tslint:disable max-line-length */

import PollingApplicationTokenConnection from "@botten-nappet/backend-twitch/src/authentication/polling-application-token-connection";

import TwitchOutgoingApplicationAuthenticationCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-outgoing-application-authentication-command-single-item-json-topics-subscriber";
import TwitchOutgoingApplicationUnauthenticationCommandSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/twitch-outgoing-application-unauthentication-command-single-item-json-topics-subscriber";

import ApplicationAuthenticatedEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/application-authenticated-event-topic-publisher";
import ApplicationUnauthenticatedEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/application-unauthenticated-event-topic-publisher";

import ApplicationAuthenticationHandlerBase from "@botten-nappet/server-twitch/src/handler/application-authentication-handler-base";

/* tslint:enable max-line-length */

@asrt(8)
@autoinject
export default abstract class ApplicationAuthenticationHandler extends ApplicationAuthenticationHandlerBase {

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() outgoingApplicationAuthenticationCommandSubscriptionConnection:
            TwitchOutgoingApplicationAuthenticationCommandSingleItemJsonTopicsSubscriber,
        @asrt() outgoingApplicationUnauthenticationCommandSubscriptionConnection:
            TwitchOutgoingApplicationUnauthenticationCommandSingleItemJsonTopicsSubscriber,
        @asrt() incomingApplicationAuthenticationEvent: ApplicationAuthenticatedEventTopicPublisher,
        @asrt() incomingApplicationUnauthenticationEvent: ApplicationUnauthenticatedEventTopicPublisher,
        @asrt()
        // @scoped(PollingApplicationTokenConnection)
        pollingApplicationTokenConnection: PollingApplicationTokenConnection,
        @asrt()
        // @scoped(PollingApplicationTokenConnection)
        applicationTokenManager: ApplicationTokenManager,
        @asrt()
        // @scoped(PollingApplicationTokenConnection)
        applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        super(
            logger,
            [
                outgoingApplicationAuthenticationCommandSubscriptionConnection,
                outgoingApplicationUnauthenticationCommandSubscriptionConnection,
            ],
            incomingApplicationAuthenticationEvent,
            incomingApplicationUnauthenticationEvent,
            pollingApplicationTokenConnection,
            applicationTokenManager,
            applicationTokenManagerConfig,
        );

        this.logger = logger.child(this.constructor.name);
    }
}
