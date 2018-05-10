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

import IIncomingCheermotesEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheermotes-event";

/* tslint:disable:max-line-length */

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import UserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";
import IncomingCheermotesEventTopicPublisher from "@botten-nappet/server-backend/src/topic-publisher/incoming-cheermotes-event-topic-publisher";
import CheermotesResponsePollingClientIdConnection from "@botten-nappet/server-twitch/src/polling-connection/cheermotes-response-polling-clientid-connection";
import IPollingCheermotesResponse from "../interface/response/polling/icheermotes-polling-response";
import PollingManager from "../polling/connection/polling-manager";

/* tslint:enable:max-line-length */

@autoinject
export default class IncomingCheermotesCommandEventTranslator extends PollingManager<IPollingCheermotesResponse> {
    constructor(
        logger: PinoLogger,
        connection: CheermotesResponsePollingClientIdConnection,
        private readonly incomingCheermotesEventEmitter: IncomingCheermotesEventTopicPublisher,
        private readonly userNameProvider: UserNameProvider,
        private readonly userIdProvider: UserIdProvider,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingCheermotesEventEmitter, "object");
        assert.equal(typeof userNameProvider, "object");
        assert.equal(typeof userIdProvider, "object");

        this.logger = logger.child(this.constructor.name);
    }

    protected async dataHandler(data: IPollingCheermotesResponse): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const event: IIncomingCheermotesEvent = {
            channel: {
                id: await this.userIdProvider.get(),
                name: await this.userNameProvider.get(),
            },
            cheermotes: data,
            // TODO: move upwards in the object creation chain?
            timestamp: new Date(),
        };

        this.incomingCheermotesEventEmitter.emit(event);
    }

    protected async filter(data: IPollingCheermotesResponse): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (typeof data !== "object") {
            return false;
        }

        if (!Array.isArray(data.actions)) {
            return false;
        }

        return true;
    }
}
