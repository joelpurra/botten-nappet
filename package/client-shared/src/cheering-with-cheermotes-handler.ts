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

import BallzManager from "./ballz-manager";
import ConsoleLog from "./console-log";
import NotificationManager from "./notification-manager";
import ScreenLog from "./screen-log";
import SimpleNotificationHandler from "./simple-notification-handler";
import SoundManager from "./sound-manager";

export default class CheeringWithCheermotesHandler extends SimpleNotificationHandler {
    private maxNumberOfBallsToAdd: number;
    private intervalMilliseconds: number;

    constructor(
        logger: ConsoleLog,
        screenLog: ScreenLog,
        notificationManager: NotificationManager,
        soundManager: SoundManager,
        randomSoundGroup: string,
        private readonly ballzManager: BallzManager,
    ) {
        super(logger, screenLog, notificationManager, soundManager, randomSoundGroup);

        this.maxNumberOfBallsToAdd = 20;
        this.intervalMilliseconds = 100;
    }

    public async handle(data: any) {
        await Promise.all(data.cheermotes.map((cheermote: any) => this.preloadImage(cheermote.url)));

        /* tslint:disable max-line-length */
        const notificationMessage = `Cheers @${data.username}, adding ${data.bits} bits with a grand total of ${data.total}! "${data.message}"`;
        /* tslint:enable max-line-length */

        const screenLogMessage = `cheered ${data.bits} bits`;

        super.handleNotification(notificationMessage, data.timestamp, data.username, screenLogMessage);

        const text = data.username;
        const numberOfBallsToAdd = Math.min(this.maxNumberOfBallsToAdd, data.bits);

        for (let i = 0; i < numberOfBallsToAdd; i++) {
            const delay = i * this.intervalMilliseconds;

            // TODO: use random library.
            const rnd = Math.floor(Math.random() * data.cheermotes.length);
            const cheermote = data.cheermotes[rnd];
            const url = cheermote.url;

            setTimeout(() => this.ballzManager.add(text, url), delay);
        }
    }

    private async preloadImage(url: string): Promise<HTMLImageElement> {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.src = url;
            image.onload = (event) => resolve(image);
            image.onabort = (event) => reject(event);
            image.onerror = (event) => reject(event);
        });
    }

}
