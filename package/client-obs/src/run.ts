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

import BallzManager from "@botten-nappet/client-shared/src/ballz-manager";
import BotSocket from "@botten-nappet/client-shared/src/bot-socket";
import CheeringWithCheermotesHandler from "@botten-nappet/client-shared/src/cheering-with-cheermotes-handler";
import ConsoleLog from "@botten-nappet/client-shared/src/console-log";
import FollowingHandler from "@botten-nappet/client-shared/src/following-handler";
import NotificationManager from "@botten-nappet/client-shared/src/notification-manager";
import ScreenLog from "@botten-nappet/client-shared/src/screen-log";
import SoundManager from "@botten-nappet/client-shared/src/sound-manager";
import statusScroller from "@botten-nappet/client-shared/src/status-scroller";
import SubscriptionHandler from "@botten-nappet/client-shared/src/subscription-handler";
import VidyHandler from "@botten-nappet/client-shared/src/vidy-handler";

import ObsEventManager from "./obs-event-manager";

export default async function client() {
    const logger = new ConsoleLog();

    const botSocketUrl = "http://localhost:3000/";
    const botSocket = new BotSocket(logger, botSocketUrl);
    await botSocket.connect();

    const screenLogElementId = "screen-log";
    const screenLogger = new ScreenLog(screenLogElementId);

    const soundRootPath = "/sound";
    const soundManager = new SoundManager(logger, soundRootPath);

    const notificationHandlerContainerElementId = "notification-container";
    const notificationManager = new NotificationManager(logger, notificationHandlerContainerElementId);
    const ballzManager = new BallzManager();

    const followingHandler = new FollowingHandler(
        logger,
        screenLogger,
        notificationManager,
        soundManager,
        "cowbell",
    );
    const cheeringWithCheermotesHandler = new CheeringWithCheermotesHandler(
        logger,
        screenLogger,
        notificationManager,
        soundManager,
        "cowbell",
        ballzManager,
    );
    const subscriptionHandler = new SubscriptionHandler(
        logger,
        screenLogger,
        notificationManager,
        soundManager,
        "cowbell",
    );
    const vidyHandler = new VidyHandler(
        "vidy-video",
    );

    const obsEventManager = new ObsEventManager(
        logger,
        botSocket,
        soundManager,
        followingHandler,
        cheeringWithCheermotesHandler,
        subscriptionHandler,
        ballzManager,
        vidyHandler,
    );

    await obsEventManager.start();

    // NOTE: debugging tool.
    window.triggerBotEvent = (botEvent: any) => obsEventManager.trigger(botEvent);

    statusScroller();
}
