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

const assert = require("power-assert");

const axios = require("axios");

export default class UserHelper {
    constructor(
        logger,
        requestHelper,
        usersDataUri,
        applicationAccessTokenProvider
    ) {
        assert.strictEqual(arguments.length, 4);
        assert.strictEqual(typeof logger, "object");
        assert.strictEqual(typeof requestHelper, "object");
        assert.strictEqual(typeof usersDataUri, "string");
        assert(usersDataUri.length > 0);
        assert(usersDataUri.startsWith("https://"));
        assert.strictEqual(typeof applicationAccessTokenProvider, "function");

        this._logger = logger.child("UserHelper");
        this._requestHelper = requestHelper;
        this._usersDataUri = usersDataUri;
        this._applicationAccessTokenProvider = applicationAccessTokenProvider;
    }

    async _getUsersData(...usernamesAndIds) {
        assert(Array.isArray(usernamesAndIds));
        assert(usernamesAndIds.length > 0);
        assert(usernamesAndIds.every((usernameOrId) => typeof usernameOrId === "string" || typeof usernameOrId === "number"));

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

        const applicationAccessToken = await this._applicationAccessTokenProvider();

        const usernames = usernamesAndIds.filter((usernameOrId) => typeof usernameOrId === "string");
        const ids = usernamesAndIds.filter((usernameOrId) => typeof usernameOrId === "number");

        const params = {
            login: usernames,
            id: ids,
        };

        // TODO: use an https class.
        const response = axios.get(
            this._usersDataUri,
            {
                paramsSerializer: this._requestHelper.twitchQuerystringSerializer,
                params: params,
                headers: {
                    Authorization: `Bearer ${applicationAccessToken}`,
                },
            }
        );

        // NOTE: axios response data.
        const data = response.data;

        // NOTE: twitch response data.
        const users = data.data;

        this._logger.trace(users, usernamesAndIds, "_getUsersData");

        return users;
    }

    async getUserIdByUserName(username) {
        assert.strictEqual(arguments.length, 1);
        assert.strictEqual(typeof username, "string");
        assert(username.length > 0);

        const usersData = await this._getUsersData(username);
        const firstUserData = usersData[0];
        const id = firstUserData.id;

        return id;
    }
}
