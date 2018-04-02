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

/* tslint:disable max-line-length */

// TODO: don't reference backend interfaces.
import ITwitchApiV5ChannelCheermotes from "@botten-nappet/backend-twitch/interface/response/polling/itwitch-api-v5-channel-cheermotes";

/* tslint:enable max-line-length */

import IChannelEvent from "./ichannel-event";

export default interface IIncomingCheermotesEvent extends IChannelEvent {
    cheermotes: ITwitchApiV5ChannelCheermotes;
}
