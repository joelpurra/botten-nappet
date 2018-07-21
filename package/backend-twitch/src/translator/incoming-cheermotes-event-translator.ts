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

import IIncomingCheermotesEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheermotes-event";

/* tslint:disable:max-line-length */

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import UserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";
import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";
import IPollingCheermotesResponse from "@botten-nappet/backend-twitch/src/interface/response/polling/icheermotes-polling-response";
import PollingManager from "@botten-nappet/backend-twitch/src/polling/connection/polling-manager";
import IncomingCheermotesEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/twitch-incoming-cheermotes-event-topic-publisher";
import CheermotesResponsePollingClientIdConnection from "@botten-nappet/server-twitch/src/polling-connection/cheermotes-response-polling-clientid-connection";

/* tslint:enable:max-line-length */

@asrt(6)
@autoinject
export default class IncomingCheermotesCommandEventTranslator extends PollingManager<IPollingCheermotesResponse> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: CheermotesResponsePollingClientIdConnection,
        @asrt() private readonly incomingCheermotesEventEmitter: IncomingCheermotesEventTopicPublisher,
        @asrt() private readonly userNameProvider: UserNameProvider,
        @asrt() private readonly userIdProvider: UserIdProvider,
        @asrt() private readonly applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        super(logger, connection);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IPollingCheermotesResponse,
    ): Promise<void> {
        const event: IIncomingCheermotesEvent = {
            application: {
                // TODO: create a class/builder for the twitch application object.
                id: this.applicationTokenManagerConfig.appClientId,
                name: "twitch",
            },
            channel: {
                id: await this.userIdProvider.get(),
                name: await this.userNameProvider.get(),
            },
            data: {
                cheermotes: data,
            },
            interfaceName: "IIncomingCheermotesEvent",
            // TODO: move upwards in the object creation chain?
            timestamp: new Date(),
        };

        this.incomingCheermotesEventEmitter.emit(event);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IPollingCheermotesResponse,
    ): Promise<boolean> {
        if (typeof data !== "object") {
            return false;
        }

        if (!Array.isArray(data.actions)) {
            return false;
        }

        return true;
    }
}
