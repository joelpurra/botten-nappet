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

import {
    Document,
    DocumentSchema,
    SchemaType,
} from "camo";

interface IDistributedEventSchema extends DocumentSchema {
    messages: SchemaType;
    topic: SchemaType;
}

export default class DistributedEventRepository extends Document<IDistributedEventSchema> {

    public static collectionName() {
        return "distributed-event";
    }

    constructor() {
        super();

        assert.hasLength(arguments, 0);

        super.schema({
            messages: {
                required: true,
                type: [Buffer],
            },
            topic: {
                required: true,
                type: String,
            },
        });
    }
}
