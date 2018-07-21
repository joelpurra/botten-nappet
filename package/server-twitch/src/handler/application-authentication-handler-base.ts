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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable max-line-length */

import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";
import MultiEventSubscriptionManager from "@botten-nappet/shared/src/event/multi-event-subscription-manager";

import ApplicationTokenManager from "@botten-nappet/backend-twitch/src/authentication/application-token-manager";
import PollingApplicationTokenConnection from "@botten-nappet/backend-twitch/src/authentication/polling-application-token-connection";
import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";

import IOutgoingApplicationAuthenticationCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-application-authentication-command";
import IOutgoingApplicationUnauthenticationCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-application-unauthentication-command";
import IApplicationAuthenticatedEvent from "@botten-nappet/interface-shared/src/event/iapplication-authenticated-event";
import IApplicationUnauthenticatedEvent from "@botten-nappet/interface-shared/src/event/iapplication-unauthenticated-event";

/* tslint:enable max-line-length */

@asrt(7)
export default abstract class ApplicationAuthenticationHandlerBase
    extends MultiEventSubscriptionManager<
    IOutgoingApplicationAuthenticationCommand
    | IOutgoingApplicationUnauthenticationCommand
    > {

    private isApplicationAuthenticated: boolean;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connections: Array<IEventSubscriptionConnection<
            IOutgoingApplicationAuthenticationCommand
            | IOutgoingApplicationUnauthenticationCommand
            >>,
        @asrt() private readonly incomingApplicationAuthenticatedEvent:
            IEventEmitter<IApplicationAuthenticatedEvent>,
        @asrt() private readonly incomingApplicationUnauthenticatedEvent:
            IEventEmitter<IApplicationUnauthenticatedEvent>,
        @asrt() private readonly pollingApplicationTokenConnection: PollingApplicationTokenConnection,
        @asrt() private readonly applicationTokenManager: ApplicationTokenManager,
        @asrt() private readonly applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        super(logger, connections);

        this.logger = logger.child(`${this.constructor.name} (${this.applicationTokenManagerConfig.appClientId})`);

        this.isApplicationAuthenticated = false;
    }

    @asrt(1)
    protected async dataHandler(
        @asrt()
        data: (
            IOutgoingApplicationAuthenticationCommand
            | IOutgoingApplicationUnauthenticationCommand
        ),
    ): Promise<void> {
        if (this.isIOutgoingApplicationUnauthenticationCommand(data)) {
            if (!this.isApplicationAuthenticated) {
                // TODO: ignore or throw for duplicate authentication?
                return;

                // throw new Error(
                //     `Application was not authenticated, cannot unauthenticate: ${
                //     data.application.name
                //     } ${
                //     data.application.id
                //     }`,
                // );
            }

            await this.applicationTokenManager.stop();
            await this.pollingApplicationTokenConnection.disconnect();

            this.isApplicationAuthenticated = false;

            const event: IApplicationUnauthenticatedEvent = {
                application: data.application,
                data: null,
                interfaceName: "IApplicationUnauthenticatedEvent",
                timestamp: new Date(),
            };

            this.incomingApplicationUnauthenticatedEvent.emit(event);

            return;
        }

        if (this.isIOutgoingApplicationAuthenticationCommand(data)) {
            if (this.isApplicationAuthenticated) {
                // TODO: ignore or throw for duplicate authentication?
                return;

                // throw new Error(
                //     `Application was already authenticated, cannot authenticate again: ${
                //     data.application.name
                //     } ${
                //     data.application.id
                //     }`,
                // );
            }

            // TODO: factory to create new "twitch applications".
            await this.pollingApplicationTokenConnection.connect();
            await this.applicationTokenManager.start();

            // NOTE: warmup and server-side token verification.
            await this.applicationTokenManager.getOrWait();

            this.isApplicationAuthenticated = true;

            const event: IApplicationAuthenticatedEvent = {
                application: data.application,
                data: null,
                interfaceName: "IApplicationAuthenticatedEvent",
                timestamp: new Date(),
            };

            this.incomingApplicationAuthenticatedEvent.emit(event);

            return;
        }

        throw new Error(`Unknown data object: ${Object.keys(data)}`);
    }

    @asrt(1)
    protected async filter(
        @asrt()
        data: IOutgoingApplicationAuthenticationCommand
            | IOutgoingApplicationUnauthenticationCommand
        ,
    ): Promise<boolean> {
        if (
            this.isIOutgoingApplicationUnauthenticationCommand(data)
            || this.isIOutgoingApplicationAuthenticationCommand(data)
        ) {
            if (
                data.application.id === this.applicationTokenManagerConfig.appClientId
            ) {
                return true;
            }

            return false;
        }

        throw new Error("Unknown event type");
    }

    @asrt(1)
    private isIOutgoingApplicationUnauthenticationCommand(
        @asrt() data: any,
    ): data is IOutgoingApplicationUnauthenticationCommand {
        const isMatch = (
            data
            && data.interfaceName === "IOutgoingApplicationUnauthenticationCommand"
            && typeof data.application === "object"
            && typeof data.application.id === "string"
            && typeof data.application.name === "string"
            // && typeof data.timestamp === "..."
            // && typeof data.data === "..."
        );

        return isMatch;
    }

    @asrt(1)
    private isIOutgoingApplicationAuthenticationCommand(
        @asrt() data: any,
    ): data is IOutgoingApplicationAuthenticationCommand {
        const isMatch = (
            data
            && data.interfaceName === "IOutgoingApplicationAuthenticationCommand"
            && typeof data.application === "object"
            && typeof data.application.id === "string"
            && typeof data.application.name === "string"
            // && typeof data.timestamp === "..."
            // && typeof data.data === "..."
        );

        return isMatch;
    }
}
