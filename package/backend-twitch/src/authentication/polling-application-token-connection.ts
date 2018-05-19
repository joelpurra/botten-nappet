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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IRawToken from "@botten-nappet/interface-shared-twitch/src/authentication/iraw-token";

import RequestHelper from "@botten-nappet/backend-twitch/src/helper/request-helper";

import PollingApplicationTokenConnectionConfig from "../config/polling-application-token-connection-config";
import PollingConnection from "../polling/connection/polling-connection";

@asrt(3)
export default class PollingApplicationTokenConnection extends PollingConnection<IRawToken> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() requestHelper: RequestHelper,
        @asrt() @scoped(PollingApplicationTokenConnectionConfig)
        private readonly pollingApplicationTokenConnectionConfig: PollingApplicationTokenConnectionConfig,
    ) {
        super(
            logger,
            pollingApplicationTokenConnectionConfig.appTokenRefreshInterval,
            false,
            "post",
            requestHelper,
        );

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    protected async getUri(): Promise<string> {
        return this.pollingApplicationTokenConnectionConfig.oauthTokenUri;
    }

    @asrt(0)
    protected async getHeaders() {
        const headers = {};

        return headers;
    }

    @asrt(0)
    protected async getData() {
        const data = {
            client_id: this.pollingApplicationTokenConnectionConfig.appClientId,
            client_secret: this.pollingApplicationTokenConnectionConfig.appClientSecret,
            grant_type: "client_credentials",
            scope: this.pollingApplicationTokenConnectionConfig.appScopes.join(" "),
        };

        return data;
    }
}
