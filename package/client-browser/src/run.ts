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

import BotSocket from "@botten-nappet/client-shared/src/bot-socket";
import ConsoleLog from "@botten-nappet/client-shared/src/console-log";
import SpeechManager from "@botten-nappet/client-shared/src/speech-manager";

import BrowserEventManager from "./browser-event-manager";

export default async function client() {
    const logger = new ConsoleLog();

    const botSocketUrl = "http://localhost:3000/";
    const botSocket = new BotSocket(logger, botSocketUrl);
    await botSocket.connect();

    const defaultVoiceName = "Fiona";
    const speechManager = new SpeechManager(logger, defaultVoiceName);

    const browserEventManager = new BrowserEventManager(
        logger,
        botSocket,
        speechManager,
    );

    await browserEventManager.start();

    // NOTE: debugging tool.
    window.triggerBotEvent = (botEvent: any) => browserEventManager.trigger(botEvent);
}
