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
import NotificationManager from "./notification-manager";
import ScreenLog from "./screen-log";
import SoundManager from "./sound-manager";

export default abstract class SimpleNotificationHandler {
    public screenLog: ScreenLog;
    protected logger: ConsoleLog;
    private randomSoundGroup: string;
    private soundManager: SoundManager;
    private notificationManager: NotificationManager;

    constructor(
        logger: ConsoleLog,
        screenLog: ScreenLog,
        notificationManager: NotificationManager,
        soundManager: SoundManager,
        randomSoundGroup: string,
    ) {
        this.logger = logger;
        this.screenLog = screenLog;
        this.notificationManager = notificationManager;
        this.soundManager = soundManager;
        this.randomSoundGroup = randomSoundGroup;
    }

    protected handleNotification(
        notificationMessage: string,
        timestamp: Date,
        username: string,
        message: string,
    ): void {
        // TODO: templates/config for messages.
        this.notificationManager.notify(notificationMessage);
        this.soundManager.playRandom(this.randomSoundGroup);

        this.screenLog.log(timestamp, username, message);
    }

    protected abstract handle(data: any): void;
}
