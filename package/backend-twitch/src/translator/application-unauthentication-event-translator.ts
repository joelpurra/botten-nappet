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

import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";
import IOutgoingApplicationUnauthenticationCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-application-unauthentication-command";
import IApplicationUnauthenticationEvent from "@botten-nappet/interface-shared/src/event/iapplication-unauthentication-event";
import OutgoingApplicationUnauthenticationCommandTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-outgoing-application-unauthentication-command-topic-publisher";
import ApplicationUnauthenticationEventSingleItemJsonTopicsSubscriber from "@botten-nappet/server-backend/src/topics-subscriber/application-unauthentication-event-single-item-json-topics-subscriber";

/* tslint:enable:max-line-length */

@asrt(4)
@autoinject
export default class ApplicationUnauthenticationEventTranslator
    extends EventSubscriptionManager<IApplicationUnauthenticationEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: ApplicationUnauthenticationEventSingleItemJsonTopicsSubscriber,
        @asrt() private readonly outgoingApplicationAuthenticationCommandEventEmitter:
            OutgoingApplicationUnauthenticationCommandTopicPublisher,
        @asrt() private readonly applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IApplicationUnauthenticationEvent,
    ): Promise<void> {
        const event: IOutgoingApplicationUnauthenticationCommand = {
            application: {
                // TODO: create a class/builder for the twitch application object.
                id: this.applicationTokenManagerConfig.appClientId,
                name: "twitch",
            },
            data: null,
            interfaceName: "IOutgoingApplicationUnauthenticationCommand",
            timestamp: new Date(),
        };

        this.outgoingApplicationAuthenticationCommandEventEmitter.emit(event);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IApplicationUnauthenticationEvent,
    ): Promise<boolean> {
        if (typeof data !== "object") {
            return false;
        }

        if (data.interfaceName !== "IApplicationUnauthenticationEvent") {
            return false;
        }

        return true;
    }
}
