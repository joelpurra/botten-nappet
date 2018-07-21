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
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IAugmentedToken from "@botten-nappet/interface-shared-twitch/src/authentication/iaugmented-token";
import IRawToken from "@botten-nappet/interface-shared-twitch/src/authentication/iraw-token";

import IUser from "@botten-nappet/server-twitch/src/storage/interface/iuser";
import IUserCamo from "@botten-nappet/server-twitch/src/storage/interface/iuser-camo";
import IUserSchema from "@botten-nappet/server-twitch/src/storage/repository/iuser-schema";
import UserRepositoryClass from "@botten-nappet/server-twitch/src/storage/repository/user-repository";

@asrt(1)
@autoinject
export default class UserStorageManager {
    private UserRepository: typeof UserRepositoryClass;
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        // TODO: inject the static UserRepositoryClass.
        // private UserRepository: typeof UserRepositoryClass,
    ) {
        this.logger = logger.child(this.constructor.name);

        // TODO: inject the static (and uninstantiated) UserRepositoryClass.
        assert.equal(typeof UserRepositoryClass, "function");
        this.UserRepository = UserRepositoryClass;
    }

    @asrt(1)
    public async getByUsername(
        @asrt() username: string,
    ): Promise<IUser> {
        assert.nonEmptyString(username);

        const findUser = {
            username,
        };

        const user = await this.UserRepository.findOne<IUserSchema>(findUser);

        this.logger.trace(user, "getByUsername");

        return user as IUser;
    }

    @asrt(1)
    public async store(
        @asrt() user: IUser,
    ) {
        assert.nonEmptyString(user.username);

        const findUser = {
            username: user.username,
        };

        const userFromDatabase: IUserCamo = await this.UserRepository.findOne(findUser) as IUserSchema;

        const userFromDatabaseWithoutId = {
            ...userFromDatabase,
        };
        delete userFromDatabaseWithoutId._id;
        delete userFromDatabaseWithoutId._schema;

        // TODO: deep merge.
        const upsertUser: IUser = {
            ...userFromDatabaseWithoutId as IUser,
            ...user,
        };
        delete upsertUser._id;

        const userAfterStoring = await this.UserRepository.findOneAndUpdate(
            userFromDatabaseWithoutId,
            upsertUser,
            {
                upsert: true,
            },
        );

        this.logger.trace(userAfterStoring, "store");

        return userAfterStoring;
    }

    @asrt(2)
    public async storeToken(
        @asrt() username: string,
        rawToken: IRawToken | null,
    ): Promise<IUser> {
        assert.nonEmptyString(username);
        // NOTE: rawToken can be null, to "forget" it.
        assert.equal(typeof rawToken, "object");

        // TODO: type system.
        assert(rawToken === null || typeof rawToken.access_token === "string");
        assert(rawToken === null || rawToken.access_token.length > 0);
        assert(rawToken === null || typeof rawToken.refresh_token === "string");
        assert(rawToken === null || rawToken.refresh_token.length > 0);
        assert(rawToken === null || typeof rawToken.expires_in === "number");
        assert(rawToken === null || typeof rawToken.scope === "string" || Array.isArray(rawToken.scope));

        // NOTE: could be empty if the token has no scopes.
        assert(rawToken === null || rawToken.scope.length > 0);

        const storedAt = Date.now();
        let expiresApproximatelyAt = null;

        if (rawToken !== null) {
            expiresApproximatelyAt = storedAt + rawToken.expires_in;
        }

        const augmentedToken: IAugmentedToken = {
            expiresApproximatelyAt,
            storedAt,
            token: rawToken,
        };

        const userWithToken: IUser = {
            twitchToken: augmentedToken,
            username,
        };

        const userAfterStoring = await this.store(userWithToken);

        this.logger.trace(userAfterStoring, "storeToken");

        return userAfterStoring;
    }
}
