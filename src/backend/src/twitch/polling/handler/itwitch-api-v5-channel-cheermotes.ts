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

export type CheermotesImageScales = "1" | "1.5" | "2" | "3" | "4";

export type CheermoteBackground = "light" | "dark";

export type CheermoteImageType = "animated" | "static";

interface ICheermoteImageTier {
    min_bits: number;
    id: string;
    color: string;
    images: {
        dark: {
            animated: ICheermoteScaledImageUrls;
            static: ICheermoteScaledImageUrls
        };
        light: {
            animated: ICheermoteScaledImageUrls;
            static: ICheermoteScaledImageUrls;
        };
    };
    can_cheer: boolean;
}

interface ICheermoteScaledImageUrls {
    "1": string;
    "1.5": string;
    "2": string;
    "3": string;
    "4": string;
}

interface ICheermoteAction {
    prefix: string;
    scales: CheermotesImageScales[];
    tiers: ICheermoteImageTier[];
}

export default interface ITwitchApiV5ChannelCheermotes {
    actions: ICheermoteAction[];
}
