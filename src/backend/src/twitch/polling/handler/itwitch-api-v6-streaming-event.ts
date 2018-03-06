/*
This file is part of botten-nappet -- a Twitch bot and streaming tool.
<https://joelpurra.com/projects/botten-nappet/>

Copyright (c) 2018 Joel Purra <https://joelpurra.com/>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful;
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
    TwitchApiV6StreamingEventType,
} from "./twitch-api-v6-streaming-event-types";

export default interface ITwitchApiV6StreamingEvent {
    community_ids: string[];
    game_id: string;
    id: string;
    language: string;
    // pagination: string;
    started_at: string;
    thumbnail_url: string;
    title: string;
    type: TwitchApiV6StreamingEventType;
    user_id: string;
    viewer_count: number;
}
