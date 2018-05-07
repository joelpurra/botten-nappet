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
    within,
} from "@botten-nappet/backend-shared/lib/dependency-injection/within/within";
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IRawToken from "@botten-nappet/interface-shared-twitch/src/authentication/iraw-token";

import RequestHelper from "@botten-nappet/backend-twitch/src/helper/request-helper";

import PollingApplicationTokenConnectionConfig from "../config/polling-application-token-connection-config";
import PollingConnection from "../polling/connection/polling-connection";

export default class PollingApplicationTokenConnection extends PollingConnection<IRawToken> {
    constructor(
        logger: PinoLogger,
        private readonly requestHelper: RequestHelper,
        @within(PollingApplicationTokenConnectionConfig, "BackendManagedMain")
        private readonly pollingApplicationTokenConnectionConfig: PollingApplicationTokenConnectionConfig,
    ) {
        super(
            logger,
            pollingApplicationTokenConnectionConfig.appTokenRefreshInterval,
            false,
            "post",
            requestHelper,
        );

        assert(arguments.length === 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof requestHelper, "object");
        assert.equal(typeof pollingApplicationTokenConnectionConfig, "object");

        assert.equal(typeof pollingApplicationTokenConnectionConfig.appClientId, "string");
        assert.greater(pollingApplicationTokenConnectionConfig.appClientId.length, 0);
        assert.equal(typeof pollingApplicationTokenConnectionConfig.appClientSecret, "string");
        assert.greater(pollingApplicationTokenConnectionConfig.appClientSecret.length, 0);
        assert(!isNaN(pollingApplicationTokenConnectionConfig.appTokenRefreshInterval));
        assert.greater(pollingApplicationTokenConnectionConfig.appTokenRefreshInterval, 0);
        assert.equal(typeof pollingApplicationTokenConnectionConfig.oauthTokenUri, "string");
        assert.greater(pollingApplicationTokenConnectionConfig.oauthTokenUri.length, 0);
        assert(pollingApplicationTokenConnectionConfig.oauthTokenUri.startsWith("https://"));
        assert(Array.isArray(pollingApplicationTokenConnectionConfig.appScopes));

        this.logger = logger.child(this.constructor.name);
    }

    protected async getUri(): Promise<string> {
        assert.hasLength(arguments, 0);

        return this.pollingApplicationTokenConnectionConfig.oauthTokenUri;
    }

    protected async getHeaders() {
        assert.hasLength(arguments, 0);

        const headers = {};

        return headers;
    }

    protected async getData() {
        assert.hasLength(arguments, 0);

        const data = {
            client_id: this.pollingApplicationTokenConnectionConfig.appClientId,
            client_secret: this.pollingApplicationTokenConnectionConfig.appClientSecret,
            grant_type: "client_credentials",
            scope: this.pollingApplicationTokenConnectionConfig.appScopes.join(" "),
        };

        return data;
    }
}
