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

import anime from "animejs";
import ConsoleLog from "./console-log";

export default class NotificationManager {
    private containerElement: HTMLDivElement;

    constructor(
        private logger: ConsoleLog,
        private elementId: string,
    ) {
        const containerElement = document.getElementById(elementId);

        if (containerElement === null) {
            throw new Error("logElement");
        }

        this.containerElement = containerElement as HTMLDivElement;
    }

    public notify(message: string) {
        this.logger.log(message, "notify");

        const notificationElement = document.createElement("div");
        notificationElement.classList.add("notification");
        notificationElement.innerText = message;
        notificationElement.style.width = `${window.innerWidth / 3}px`;
        notificationElement.style.left = `${(window.innerWidth / 2) - (window.innerWidth / 6)}px`;
        this.containerElement.appendChild(notificationElement);

        const timeline = anime.timeline();

        const pageCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        };

        timeline
            .add({
                duration: 1000,
                easing: "linear",
                targets: notificationElement,
                translateY: pageCenter.y - (notificationElement.clientHeight / 2),
            })
            .add({
                complete: () => {
                    notificationElement.parentElement!.removeChild(notificationElement);
                },
                duration: 4000,
                targets: notificationElement,
            });
    }
}
