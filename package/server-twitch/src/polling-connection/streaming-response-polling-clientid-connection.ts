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

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";
import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

/* tslint:disable:max-line-length */

import PollingClientIdConnection from "@botten-nappet/backend-twitch/src/polling/connection/polling-clientid-connection";

import IPollingStreamingResponse from "@botten-nappet/backend-twitch/src/interface/response/polling/istreaming-polling-response";

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";

/* tslint:enable:max-line-length */

@asrt(3)
@autoinject
export default class StreamingResponsePollingClientIdConnection
    extends PollingClientIdConnection<IPollingStreamingResponse> {
    constructor(
        @asrt() backendConfig: BackendConfig,
        @asrt() logger: PinoLogger,
        @asrt() private readonly userIdProvider: UserIdProvider,
    ) {
        super(
            logger,
            backendConfig.twitchAppClientId,
            backendConfig.bottenNappetStreamingPollingInterval,
            false,
            "get",
        );

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    protected async getUri(): Promise<string> {
        const userId = await this.userIdProvider.get();

        // TODO: externalize/configure base url.
        const streamingPollingUri = `https://api.twitch.tv/helix/streams?user_id=${userId}`;

        return streamingPollingUri;
    }
}
