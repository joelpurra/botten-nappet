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

import IOutgoingSearchCommand from "@botten-nappet/interface-shared-vidy/src/event/ioutgoing-search-command";

interface IPaginatedResults<T> {
    nextPageKey: string;
    results: T[];
}

interface IClip {
    "id": string;
    "shortId": string;
    "media": string;
    "duration": number;
    "text": string;
    "files": {
        [key: string]: {
            "width": number;
            "height": number;
            "url": string;
            "type": string;
            "size": number;
            "dominantColor": string;
        };
    };
    "tags": string[];
    "account": string;
    "username": string;
    "private": boolean;
}

type Tag = string;

export default interface IIncomingSearchResultEvent {
    search: IOutgoingSearchCommand;
    clips: IPaginatedResults<IClip>;
    tags: IPaginatedResults<Tag>;
}
