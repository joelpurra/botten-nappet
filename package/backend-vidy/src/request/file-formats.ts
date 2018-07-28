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

import IFileFormat from "@botten-nappet/backend-vidy/src/request/ifile-format";

const FileFormats: IFileFormat[] = [
    {
        accountType: "Premium",
        dimension: {
            height: 240,
            width: 426,
        },
        name: "landscapeCleanVideo240",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 240,
            width: 426,
        },
        name: "landscapeCleanImage240",
        type: "jpg",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 240,
            width: 426,
        },
        name: "landscapeCleanGif240",
        type: "gif",
    },

    {
        accountType: "Basic",
        dimension: {
            height: 240,
            width: 426,
        },
        name: "landscapeVideo240",
        type: "mp4",
    },

    {
        accountType: "Basic",
        dimension: {
            height: 240,
            width: 426,
        },
        name: "landscapeImage240",
        type: "jpg",
    },

    {
        accountType: "Basic",
        dimension: {
            height: 240,
            width: 426,
        },
        name: "landscapeGif240",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 360,
            width: 240,
        },
        name: "portraitCleanVideo240",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 360,
            width: 240,
        },
        name: "portraitCleanImage240",
        type: "jpg",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 360,
            width: 240,
        },
        name: "portraitCleanGif240",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 360,
            width: 240,
        },
        name: "portraitVideo240",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 360,
            width: 240,
        },
        name: "portraitImage240",
        type: "jpg",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 360,
            width: 240,
        },
        name: "portraitGif240",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 360,
            width: 240,
        },
        name: "portraitBoomerangVideo240",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 360,
            width: 240,
        },
        name: "portraitBoomerangGif240",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 480,
            width: 854,
        },
        name: "landscapeCleanVideo480",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 480,
            width: 854,
        },
        name: "landscapeCleanImage480",
        type: "jpg",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 480,
            width: 854,
        },
        name: "landscapeCleanGif480",
        type: "gif",
    },

    {
        accountType: "Basic",
        dimension: {
            height: 480,
            width: 854,
        },
        name: "landscapeVideo480",
        type: "mp4",
    },

    {
        accountType: "Basic",
        dimension: {
            height: 480,
            width: 854,
        },
        name: "landscapeImage480",
        type: "jpg",
    },

    {
        accountType: "Basic",
        dimension: {
            height: 480,
            width: 854,
        },
        name: "landscapeGif480",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 480,
        },
        name: "portraitCleanVideo480",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 480,
        },
        name: "portraitCleanImage480",
        type: "jpg",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 480,
        },
        name: "portraitCleanGif480",
        type: "gif",
    },

    {
        accountType: "Basic",
        dimension: {
            height: 720,
            width: 480,
        },
        name: "portraitVideo480",
        type: "mp4",
    },

    {
        accountType: "Basic",
        dimension: {
            height: 720,
            width: 480,
        },
        name: "portraitImage480",
        type: "jpg",
    },

    {
        accountType: "Basic",
        dimension: {
            height: 720,
            width: 480,
        },
        name: "portraitGif480",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 480,
        },
        name: "portraitBoomerangVideo480",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 480,
        },
        name: "portraitBoomerangGif480",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 1280,
        },
        name: "landscapeCleanVideo720",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 1280,
        },
        name: "landscapeCleanImage720",
        type: "jpg",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 1280,
        },
        name: "landscapeCleanGif720",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 1280,
        },
        name: "landscapeVideo720",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 1280,
        },
        name: "landscapeImage720",
        type: "jpg",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 720,
            width: 1280,
        },
        name: "landscapeGif720",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 1080,
            width: 720,
        },
        name: "portraitCleanVideo720",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 1080,
            width: 720,
        },
        name: "portraitCleanImage720",
        type: "jpg",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 1080,
            width: 720,
        },
        name: "portraitCleanGif720",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 1080,
            width: 720,
        },
        name: "portraitVideo720",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 1080,
            width: 720,
        },
        name: "portraitImage720",
        type: "jpg",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 1080,
            width: 720,
        },
        name: "portraitGif720",
        type: "gif",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 1080,
            width: 720,
        },
        name: "portraitBoomerangVideo720",
        type: "mp4",
    },

    {
        accountType: "Premium",
        dimension: {
            height: 1080,
            width: 720,
        },
        name: "portraitBoomerangGif720",
        type: "gif",
    },

];

export default FileFormats;
