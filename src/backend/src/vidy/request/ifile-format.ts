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

export type FileFormatName = "landscapeCleanGif240"
    | "landscapeCleanGif480"
    | "landscapeCleanGif720"
    | "landscapeCleanImage240"
    | "landscapeCleanImage480"
    | "landscapeCleanImage720"
    | "landscapeCleanVideo240"
    | "landscapeCleanVideo480"
    | "landscapeCleanVideo720"
    | "landscapeGif240"
    | "landscapeGif480"
    | "landscapeGif720"
    | "landscapeImage240"
    | "landscapeImage480"
    | "landscapeImage720"
    | "landscapeVideo240"
    | "landscapeVideo480"
    | "landscapeVideo720"
    | "portraitBoomerangGif240"
    | "portraitBoomerangGif480"
    | "portraitBoomerangGif720"
    | "portraitBoomerangVideo240"
    | "portraitBoomerangVideo480"
    | "portraitBoomerangVideo720"
    | "portraitCleanGif240"
    | "portraitCleanGif480"
    | "portraitCleanGif720"
    | "portraitCleanImage240"
    | "portraitCleanImage480"
    | "portraitCleanImage720"
    | "portraitCleanVideo240"
    | "portraitCleanVideo480"
    | "portraitCleanVideo720"
    | "portraitGif240"
    | "portraitGif480"
    | "portraitGif720"
    | "portraitImage240"
    | "portraitImage480"
    | "portraitImage720"
    | "portraitVideo240"
    | "portraitVideo480"
    | "portraitVideo720";

export type FileFormatType = "mp4"
    | "jpg"
    | "gif";

export type FileFormatAccountType = "Premium"
    | "Basic";

export interface IFileFormatDimension {
    width: number;
    height: number;
}

export default interface IFileFormat {
    name: FileFormatName;
    dimension: IFileFormatDimension;
    type: FileFormatType;
    accountType: FileFormatAccountType;
}
