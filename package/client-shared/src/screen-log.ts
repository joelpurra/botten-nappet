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

export default class ScreenLog {
    private logElement: HTMLDivElement;

    constructor(elementId: string) {
        const logElement = document.getElementById(elementId);

        if (logElement === null) {
            throw new Error("logElement");
        }

        this.logElement = logElement as HTMLDivElement;
    }

    public log(timestamp: Date, username: string, message: string) {
        /* tslint:disable no-console */
        console.log("log", timestamp, username, message);
        /* tslint:enable no-console */

        const logMessage = document.createElement("div");
        logMessage.classList.add("log-message");

        // NOTE: disabled timestamps.
        // const timeElement = document.createElement("time");
        // timeElement.classList.add("timestamp");
        // timeElement.innerText = `${timestamp.getHours()}:${timestamp.getMinutes()}`;
        // logMessage.appendChild(timeElement);

        const usernameElement = document.createElement("span");
        usernameElement.classList.add("username");
        usernameElement.innerText = username;
        logMessage.appendChild(usernameElement);

        const messageElement = document.createElement("span");
        messageElement.classList.add("message");
        messageElement.innerText = message;
        logMessage.appendChild(messageElement);

        this.logElement.insertBefore(logMessage, this.logElement.firstElementChild);
    }
}
