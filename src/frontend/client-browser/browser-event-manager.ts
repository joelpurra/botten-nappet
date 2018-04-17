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

import Rx from "rxjs";

import {
    NextObserver,
} from "rxjs/internal/Observer";

import BotSocket from "../shared/bot-socket";
import ConsoleLog from "../shared/console-log";
import SpeechManager from "../shared/speech-manager";
import { deepParseIso8601UtcDates } from "../shared/utilities";

export default class BrowserEventManager {
    public chatMessageSayIgnoredStrings: string[];
    public chatMessageSayIgnoredUsernames: string[];
    private dataHandlerSubscription: Rx.Subscription | null;
    private handlerObservable: Rx.Observable<any> | null;
    private handlers: {
        [key: string]: (data: any) => void;
    };

    constructor(
        private readonly logger: ConsoleLog,
        private readonly botSocket: BotSocket,
        private readonly speechManager: SpeechManager,
    ) {
        // TODO: share this code.
        this.dataHandlerSubscription = null;
        this.handlerObservable = null;

        this.chatMessageSayIgnoredUsernames = [
            // TODO: configure ignored username(s).
            // "joelpurra",
        ];

        this.chatMessageSayIgnoredStrings = [
            // TODO: configure ignored strings(s)
            "http://",
            "https://",
            "www.",
            "😀",
        ];

        this.handlers = {
            "chat-message": (data: any) => {
                logger.log("chat-message", data);

                const shouldSay = this.shouldSayChatMessageOutLoud(data);

                const cleanedUsername = data.username.replace(/\d+/, " ");

                if (shouldSay) {
                    this.speechManager.say(`${cleanedUsername} says: ${data.message}`);
                }
            },

            "animate": (data: any) => {
                // NOTE: fake-phonetic version of "balls".
                this.speechManager.say(`Hey, ${data.username}, you've got baullzzz!`);
            },

            "say": (data: any) => {
                this.speechManager.say(data.message);
            },

            // "message": (data: any) => {
            //     logger.log("message", data);
            // },
        };
    }

    public async start(): Promise<void> {
        // TODO: share this code.
        this.handlerObservable = this.botSocket.dataObservable
            .do((botEvent) => {
                this.logger.log("botEvent", botEvent);
            })
            .map((botEvent) => {
                return deepParseIso8601UtcDates(botEvent);
            })
            .do((botEvent) => {
                this.logger.log("botEvent", botEvent);
            });

        const dataHandlerObserver: NextObserver<any> = {
            next: (botEvent) => this.trigger(botEvent),
        };

        // TODO: unsubscribe.
        this.dataHandlerSubscription = this.handlerObservable.subscribe(dataHandlerObserver);
    }

    public trigger(botEvent: any): void {
        // TODO: share this code.
        if (!this.handlers[botEvent.event]) {
            this.logger.error("Missing event handler", botEvent.event);
            return;
        }

        this.handlers[botEvent.event](botEvent.data);
    }

    private shouldSayChatMessageOutLoud(data: any) {
        if (data.isSubscriber !== true) {
            return false;
        }

        if (this.chatMessageSayIgnoredUsernames.includes(data.username)) {
            return false;
        }

        if (this.chatMessageSayIgnoredStrings.some((ignoredStr) => data.message.includes(ignoredStr))) {
            return false;
        }

        return true;
    }
}
