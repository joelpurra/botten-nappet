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
    Document,
} from "camo";

import AugmentedTokenEmbeddedDocument from "@botten-nappet/server-twitch/src/storage/repository/embedded-documents/augmented-token-embedded-document";
import IUserSchema from "@botten-nappet/server-twitch/src/storage/repository/iuser-schema";

@asrt(0)
export default class UserRepository extends Document<IUserSchema> {

    public static collectionName() {
        return "user";
    }

    constructor() {
        super();

        super.schema({
            twitchToken: {
                type: AugmentedTokenEmbeddedDocument,
            },
            username: {
                match: /^[a-z0-9][a-z0-9-]/i,
                required: true,
                type: String,
                unique: true,
            },
        });
    }
}
