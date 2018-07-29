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

import IOutgoingUserAuthenticationCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-user-authentication-command";
import IOutgoingUserUnauthenticationCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-user-unauthentication-command";
import IUserAuthenticatedEvent from "@botten-nappet/interface-shared/src/event/iuser-authenticated-event";
import IUserUnauthenticatedEvent from "@botten-nappet/interface-shared/src/event/iuser-unauthenticated-event";

import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";
import MultiEventSubscriptionManager from "@botten-nappet/shared/src/event/multi-event-subscription-manager";

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";

import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";

import PerUserConnectablesMain from "@botten-nappet/server-twitch/src/application/per-user-connectables-main";
import PerUserHandlersMain from "@botten-nappet/server-twitch/src/application/per-user-handlers-main";

/* tslint:enable max-line-length */

@asrt(8)
export default abstract class UserAuthenticationHandlerBase
    extends MultiEventSubscriptionManager<
    IOutgoingUserAuthenticationCommand
    | IOutgoingUserUnauthenticationCommand
    > {

    private isUserAuthenticated: boolean;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connections: Array<IEventSubscriptionConnection<
            IOutgoingUserAuthenticationCommand
            | IOutgoingUserUnauthenticationCommand
            >>,
        @asrt() private readonly incomingUserAuthenticationEvent:
            IEventEmitter<IUserAuthenticatedEvent>,
        @asrt() private readonly incomingUserUnauthenticationEvent:
            IEventEmitter<IUserUnauthenticatedEvent>,
        @asrt() private readonly applicationTokenManagerConfig: ApplicationTokenManagerConfig,
        @asrt() private readonly userIdProvider: UserIdProvider,
        @asrt() private readonly perUserHandlersMain: PerUserHandlersMain,
        @asrt() private readonly perUserConnectablesMain: PerUserConnectablesMain,
    ) {
        super(logger, connections);

        this.logger = logger.child(this.constructor.name);

        this.isUserAuthenticated = false;
    }

    @asrt(1)
    protected async dataHandler(
        @asrt()
        data: (
            IOutgoingUserAuthenticationCommand
            | IOutgoingUserUnauthenticationCommand
        ),
    ): Promise<void> {
        if (this.isIOutgoingUserUnauthenticationCommand(data)) {
            if (!this.isUserAuthenticated) {
                // TODO: ignore or throw for duplicate authentication?
                return;

                // throw new Error(
                //     `User was not authenticated, cannot unauthenticate: ${
                //     data.recipient.name
                //     } ${
                //     data.recipient.id
                //     }`,
                // );
            }

            await this.perUserHandlersMain.stop();
            await this.perUserConnectablesMain.stop();

            this.isUserAuthenticated = false;

            const event: IUserUnauthenticatedEvent = {
                application: {
                    // TODO: create a class/builder for the twitch application object.
                    id: this.applicationTokenManagerConfig.appClientId,
                    name: "twitch",
                },
                data: null,
                interfaceName: "IUserUnauthenticatedEvent",
                recipient: {
                    id: data.recipient.id,
                    name: data.recipient.name,
                },
                timestamp: new Date(),
            };

            this.incomingUserUnauthenticationEvent.emit(event);

            return;
        }

        if (this.isIOutgoingUserAuthenticationCommand(data)) {
            if (this.isUserAuthenticated) {
                // TODO: ignore or throw for duplicate authentication?
                return;

                // throw new Error(
                //     `User was already authenticated, cannot authenticate again: ${
                //     data.recipient.name
                //     } ${
                //     data.recipient.id
                //     }`,
                // );
            }

            // TODO: factory to create new "twitch user-based applications".
            await this.perUserConnectablesMain.start();
            await this.perUserHandlersMain.start();

            this.isUserAuthenticated = true;

            const event: IUserAuthenticatedEvent = {
                application: {
                    // TODO: create a class/builder for the twitch application object.
                    id: this.applicationTokenManagerConfig.appClientId,
                    name: "twitch",
                },
                data: null,
                interfaceName: "IUserAuthenticatedEvent",
                recipient: {
                    id: data.recipient.id,
                    name: data.recipient.name,
                },
                timestamp: new Date(),
            };

            this.incomingUserAuthenticationEvent.emit(event);

            return;
        }

        throw new Error(`Unknown data object: ${Object.keys(data)}`);
    }

    @asrt(1)
    protected async filter(
        @asrt()
        data: IOutgoingUserAuthenticationCommand
            | IOutgoingUserUnauthenticationCommand
        ,
    ): Promise<boolean> {
        if (
            this.isIOutgoingUserUnauthenticationCommand(data)
            || this.isIOutgoingUserAuthenticationCommand(data)
        ) {
            if (
                data.recipient.id === await this.userIdProvider.get()
            ) {
                return true;
            }

            return false;
        }

        throw new Error("Unknown event type");
    }

    @asrt(1)
    private isIOutgoingUserUnauthenticationCommand(
        @asrt() data: any,
    ): data is IOutgoingUserUnauthenticationCommand {
        const isMatch = (
            data
            && data.interfaceName === "IOutgoingUserUnauthenticationCommand"
            && typeof data.recipient === "object"
            && typeof data.recipient.id === "number"
            && typeof data.recipient.name === "string"
            // && typeof data.timestamp === "..."
            // && typeof data.data === "..."
        );

        return isMatch;
    }

    @asrt(1)
    private isIOutgoingUserAuthenticationCommand(
        @asrt() data: any,
    ): data is IOutgoingUserAuthenticationCommand {
        const isMatch = (
            data
            && data.interfaceName === "IOutgoingUserAuthenticationCommand"
            && typeof data.recipient === "object"
            && typeof data.recipient.id === "number"
            && typeof data.recipient.name === "string"
            // && typeof data.timestamp === "..."
            // && typeof data.data === "..."
        );

        return isMatch;
    }
}
