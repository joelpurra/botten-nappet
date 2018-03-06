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

export default interface IClientContext {
    app: {
        name: string;
        version: string;
        build: number;
    };
    device: {
        type: "phone" | "tablet" | "other";
        id: string;
        manufacturer: string;
        model: string;
        name: string;
    };
    locale: string;
    location?: {
        latitude?: number;
        longitude?: number;
        speed?: number;
    };
    network?: {
        bluetooth?: boolean;
        carrier?: string;
        cellular?: boolean;
        wifi?: boolean;
    };
    os: {
        name: string;
        version: string;
    };
    screen?: {
        density?: number;
        height?: number;
        width?: number;
    };

    // TODO: store localtime as Date, move serialization deeper in the code?
    localtime: string;
}
