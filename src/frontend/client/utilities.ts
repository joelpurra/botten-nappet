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

// 2018-03-04T15:27:28.338Z
const iso8601UtcDateTimeRx = /\d{4}\-\d{2}\-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z/;

export const deepParseIso8601UtcDates = (val: any): any => {
    if (typeof val === "string" && iso8601UtcDateTimeRx.test(val)) {
        // TODO: use momentjs?
        return new Date(Date.parse(val));
    }

    if (Array.isArray(val)) {
        return val.map(deepParseIso8601UtcDates);
    }

    if (typeof val !== "object") {
        return val;
    }

    if (val === null) {
        return val;
    }

    return Object.keys(val).reduce((obj: any, key) => {
        obj[key] = deepParseIso8601UtcDates(val[key]);

        return obj;
    },
        {},
    );
};
