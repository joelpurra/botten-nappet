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

import axios from "axios";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IAugmentedToken from "@botten-nappet/interface-shared-twitch/src/authentication/iaugmented-token";
import IRawToken from "@botten-nappet/interface-shared-twitch/src/authentication/iraw-token";

import TokenHelperConfig from "../config/token-helper-config";
import RequestHelper from "./request-helper";

@asrt(3)
@autoinject
export default class TokenHelper {
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly requestHelper: RequestHelper,
        @asrt() private readonly twitchTokenHelperConfig: TokenHelperConfig,
    ) {
        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    public async revoke(
        @asrt() rawToken: IRawToken,
    ): Promise<void> {
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

        this.logger.debug(rawToken, data, "revoke");
    }

    @asrt(1)
    public async isExpired(
        @asrt() token: IAugmentedToken,
    ): Promise<boolean> {
        if (token.expiresApproximatelyAt === null) {
            return true;
        }

        if (token.expiresApproximatelyAt < Date.now()) {
            return true;
        }

        return false;
    }

    @asrt(1)
    public async validate(
        @asrt() rawToken: IRawToken,
    ): Promise<boolean> {
        // TODO: only allow a single outstanding token validation per user.
        // TODO: memoize the most recent good result for a couple of seconds, to reduce remote calls.
        const tokenValidation = await this.getTokenValidation(rawToken);

        // NOTE: twitch response data.
        const valid = tokenValidation.valid;

        this.logger.trace(rawToken, valid, "validate");

        return valid;
    }

    @asrt(1)
    public async getUserIdByRawAccessToken(
        @asrt() token: IRawToken,
    ): Promise<number> {
        const tokenValidation = await this.getTokenValidation(token);

        // NOTE: twitch response data.
        // TODO: use a number type/interface instead of safety-parsing.
        const userId = parseInt(tokenValidation.user_id, 10);

        this.logger.trace(token, userId, "getUserIdByRawAccessToken");

        return userId;
    }

    @asrt(1)
    public async getUserNameByRawAccessToken(
        @asrt() token: IRawToken,
    ): Promise<string> {
        const tokenValidation = await this.getTokenValidation(token);

        // NOTE: twitch response data.
        const userName = tokenValidation.user_name;

        this.logger.trace(token, userName, "getUserNameByRawAccessToken");

        return userName;
    }

    @asrt(1)
    private async getTokenValidation(
        @asrt() rawToken: IRawToken,
    ) {
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
