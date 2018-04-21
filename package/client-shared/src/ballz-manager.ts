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

import ConsoleLog from "./console-log";

export default class BallzManager {
    private defaultBallTimeout: number;
    private logger: ConsoleLog;

    constructor(logger: ConsoleLog) {
        this.logger = logger;

        this.defaultBallTimeout = 5000;
    }

    public add(text: string, colorOrUrl?: string, ballTimeout?: number) {
        const detail = {
            ballTimeout: ballTimeout || this.defaultBallTimeout,
            colorOrUrl,
            text,
        };

        const addBallEvent = new CustomEvent("add-ball", {
            bubbles: true,
            cancelable: false,
            detail,
        });

        document.dispatchEvent(addBallEvent);
    }
}
