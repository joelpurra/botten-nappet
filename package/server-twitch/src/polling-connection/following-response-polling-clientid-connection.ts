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
import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import PollingClientIdConnection from "@botten-nappet/backend-twitch/src/polling/connection/polling-clientid-connection";

import IPollingFollowingResponse from "@botten-nappet/backend-twitch/src/interface/response/polling/ifollowing-polling-response";

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";

/* tslint:enable:max-line-length */

@autoinject
export default class FollowingResponsePollingClientIdConnection
    extends PollingClientIdConnection<IPollingFollowingResponse> {
    constructor(
        private readonly backendConfig: BackendConfig,
        logger: PinoLogger,
        private readonly userIdProvider: UserIdProvider,
    ) {
        super(
            logger,
            backendConfig.twitchAppClientId,
            backendConfig.bottenNappetDefaultPollingInterval,
            false,
            "get",
        );

        // TODO: validate arguments.
        this.logger = logger.child(this.constructor.name);
    }

    protected async getUri(): Promise<string> {
        assert.hasLength(arguments, 0);

        const userId = await this.userIdProvider.get();

        // TODO: externalize/configure base url.
        const followingPollingUri =
            `https://api.twitch.tv/kraken/channels/${
            userId
            }/follows?limit=${
            this.backendConfig.followingPollingLimit
            }`;

        return followingPollingUri;
    }
}
