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

import axios from "axios";

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import IAugmentedToken from "@botten-nappet/interface-twitch/authentication/iaugmented-token";
import IRawToken from "@botten-nappet/interface-twitch/authentication/iraw-token";

import TokenHelperConfig from "../../config/token-helper-config";
import RequestHelper from "./request-helper";

@autoinject
export default class TokenHelper {
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        private readonly requestHelper: RequestHelper,
        private readonly twitchTokenHelperConfig: TokenHelperConfig,
    ) {
        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof requestHelper, "object");
        assert.equal(typeof twitchTokenHelperConfig, "object");

        assert.nonEmptyString(twitchTokenHelperConfig.oauthTokenRevocationUri);
        assert(twitchTokenHelperConfig.oauthTokenRevocationUri.startsWith("https://"));
        assert.nonEmptyString(twitchTokenHelperConfig.oauthTokenVerificationUri);
        assert(twitchTokenHelperConfig.oauthTokenVerificationUri.startsWith("https://"));
        assert.nonEmptyString(twitchTokenHelperConfig.appClientId);

        this.logger = logger.child(this.constructor.name);
    }

    public async revoke(rawToken: IRawToken): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof rawToken, "object");

        // https://dev.twitch.tv/docs/authentication#revoking-access-tokens

        const accessToken = rawToken.access_token;

        const params = {
            client_id: this.twitchTokenHelperConfig.appClientId,
            token: accessToken,
        };

        // TODO: use an https class.
        const response = await axios.post(
            this.twitchTokenHelperConfig.oauthTokenRevocationUri,
            params,
            {
                paramsSerializer: this.requestHelper.twitchQuerystringSerializer,
            },
        );

        // NOTE: axios response data.
        const data = response.data;

        // TODO: what if it's not ok?
        // TODO: define type/interface.
        const ok = data.status === "ok";

        this.logger.trace(rawToken, data, "revoke");
    }

    public async isExpired(token: IAugmentedToken): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof token, "object");
        assert.equal(typeof token.token, "object");

        if (token.expiresApproximatelyAt === null) {
            return true;
        }

        if (token.expiresApproximatelyAt < Date.now()) {
            return true;
        }

        return false;
    }

    public async validate(rawToken: IRawToken): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof rawToken, "object");

        // TODO: only allow a single outstanding token validation per user.
        // TODO: memoize the most recent good result for a couple of seconds, to reduce remote calls.
        const tokenValidation = await this.getTokenValidation(rawToken);

        // NOTE: twitch response data.
        const valid = tokenValidation.valid;

        this.logger.trace(rawToken, valid, "validate");

        return valid;
    }

    public async getUserIdByRawAccessToken(token: IRawToken): Promise<number> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof token, "object");
        assert.not.null(token);

        const tokenValidation = await this.getTokenValidation(token);

        // NOTE: twitch response data.
        // TODO: use a number type/interface instead of safety-parsing.
        const userId = parseInt(tokenValidation.user_id, 10);

        this.logger.trace(token, userId, "getUserIdByRawAccessToken");

        return userId;
    }

    public async getUserNameByRawAccessToken(token: IRawToken): Promise<string> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof token, "object");

        const tokenValidation = await this.getTokenValidation(token);

        // NOTE: twitch response data.
        const userName = tokenValidation.user_name;

        this.logger.trace(token, userName, "getUserNameByRawAccessToken");

        return userName;
    }

    private async getTokenValidation(rawToken: IRawToken) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof rawToken, "object");
        assert.nonEmptyString(rawToken.access_token);

        // https://dev.twitch.tv/docs/v5#root-url
        //
        // const sampleResponse = {
        //     "token": {
        //         "authorization": {
        //             "created_at": "2016-12-14T15:51:16Z",
        //             "scopes": [
        //                 "user_read",
        //             ],
        //             "updated_at": "2016-12-14T15:51:16Z",
        //         },
        //         "client_id": "uo6dggojyb8d6soh92zknwmi5ej1q2",
        //         "user_id": "44322889",
        //         "user_name": "dallas",
        //         "valid": true,
        //     },
        // };

        const accessToken = rawToken.access_token;

        // TODO: use an https class.
        const response = await axios.get(
            this.twitchTokenHelperConfig.oauthTokenVerificationUri,
            {
                headers: {
                    "Accept": "application/vnd.twitchtv.v5+json",
                    "Authorization": `OAuth ${accessToken}`,
                    "Client-ID": this.twitchTokenHelperConfig.appClientId,
                },
            },
        );

        // NOTE: axios response data.
        const data = response.data;

        // NOTE: twitch response data.
        // TODO: verify data format.
        const tokenValidation = data.token;

        this.logger.trace(rawToken, tokenValidation, "getTokenValidation");

        // TODO: define type/interface.
        return tokenValidation;
    }
}
