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
    assert,
} from "check-types";

import axios from "axios";

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import {
    ApplicationAccessTokenProviderType,
} from "../authentication/provider-types";
import RequestHelper from "./request-helper";

type UserNameOrId = string | number;

export default class UserHelper {
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        private requestHelper: RequestHelper,
        private usersDataUri: string,
        private applicationAccessTokenProvider: ApplicationAccessTokenProviderType,
    ) {
        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof requestHelper, "object");
        assert.nonEmptyString(usersDataUri);
        assert(usersDataUri.startsWith("https://"));
        assert.equal(typeof applicationAccessTokenProvider, "function");

        this.logger = logger.child(this.constructor.name);
    }

    public async getUsersData(...usernamesAndIds: UserNameOrId[]) {
        assert(Array.isArray(usernamesAndIds));
        assert(usernamesAndIds.length > 0);
        assert(usernamesAndIds.every((usernameOrId) =>
            typeof usernameOrId === "string"
            || typeof usernameOrId === "number"),
        );

        /* tslint:disable:max-line-length */
        // https://dev.twitch.tv/docs/api/reference#get-users
        // const sampleResponse = {
        //     "data": [
        //         {
        //             "id": "44322889",
        //             "login": "dallas",
        //             "display_name": "dallas",
        //             "type": "staff",
        //             "broadcaster_type": "",
        //             "description": "Just a gamer playing games and chatting. :)",
        //             "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
        //             "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
        //             "view_count": 191836881,
        //             "email": "login@provider.com",
        //         },
        //     ],
        // };
        /* tslint:enable:max-line-length */

        const applicationAccessToken = await this.applicationAccessTokenProvider();

        const usernames = usernamesAndIds.filter((usernameOrId) => typeof usernameOrId === "string");
        const ids = usernamesAndIds.filter((usernameOrId) => typeof usernameOrId === "number");

        const params = {
            id: ids,
            login: usernames,
        };

        // TODO: use an https class.
        const response = await axios.get(
            this.usersDataUri,
            {
                headers: {
                    Authorization: `Bearer ${applicationAccessToken}`,
                },
                params,
                paramsSerializer: this.requestHelper.twitchQuerystringSerializer,
            },
        );

        // NOTE: axios response data.
        const data = response.data;

        // NOTE: twitch response data.
        // TODO: define type.
        const users = data.data;

        this.logger.trace(users, usernamesAndIds, "getUsersData");

        return users;
    }

    public async getUserIdByUserName(username: string): Promise<number> {
        assert.hasLength(arguments, 1);
        assert.nonEmptyString(username);

        const usersData = await this.getUsersData(username);
        const firstUserData = usersData[0];

        // TODO: use a number type/interface instead of safety-parsing.
        const userId = parseInt(firstUserData.id, 10);

        return userId;
    }
}
