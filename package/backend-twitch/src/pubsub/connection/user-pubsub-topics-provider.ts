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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import UserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";

@autoinject
export default class UserPubSubTopicsProvider {
    constructor(
        private readonly userIdProvider: UserIdProvider,
    ) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof userIdProvider, "object");
    }

    public async get(): Promise<string[]> {
        assert.hasLength(arguments, 0);

        const userId = await this.userIdProvider.get();

        const allPubSubTopicsForTwitchUserId = [
            `channel-bits-events-v1.${userId}`,
            `channel-subscribe-events-v1.${userId}`,
            `channel-commerce-events-v1.${userId}`,
            `whispers.${userId}`,
        ];

        return allPubSubTopicsForTwitchUserId;
    }
}
