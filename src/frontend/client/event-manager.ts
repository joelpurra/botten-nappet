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

import BallzManager from "./ballz-manager";
import BotSocket from "./bot-socket";
import CheeringWithCheermotesHandler from "./cheering-with-cheermotes-handler";
import ConsoleLog from "./console-log";
import FollowingHandler from "./following-handler";
import SoundManager from "./sound-manager";
import SpeechManager from "./speech-manager";
import SubscriptionHandler from "./subscription-handler";
import { deepParseIso8601UtcDates } from "./utilities";
import VidyHandler from "./vidy-handler";

export default class EventManager {
    private animateBallTimeout: number;
    private vidyHandler: VidyHandler;
    private dataHandlerSubscription: Rx.Subscription | null;
    private handlerObservable: Rx.Observable<any> | null;
    private handlers: {
        [key: string]: (data: any) => void;
    };
    private ballzManager: BallzManager;
    private subscriptionHandler: SubscriptionHandler;
    private cheeringWithCheermotesHandler: CheeringWithCheermotesHandler;
    private followingHandler: FollowingHandler;
    private soundManager: SoundManager;
    private speechManager: SpeechManager;
    private botSocket: BotSocket;
    private logger: ConsoleLog;

    constructor(
        logger: ConsoleLog,
        botSocket: BotSocket,
        soundManager: SoundManager,
        speechManager: SpeechManager,
        followingHandler: FollowingHandler,
        cheeringWithCheermotesHandler: CheeringWithCheermotesHandler,
        subscriptionHandler: SubscriptionHandler,
        ballzManager: BallzManager,
        vidyHandler: VidyHandler,
    ) {
        this.logger = logger;
        this.botSocket = botSocket;
        this.soundManager = soundManager;
        this.speechManager = speechManager;
        this.followingHandler = followingHandler;
        this.cheeringWithCheermotesHandler = cheeringWithCheermotesHandler;
        this.subscriptionHandler = subscriptionHandler;
        this.ballzManager = ballzManager;
        this.vidyHandler = vidyHandler;

        this.dataHandlerSubscription = null;
        this.handlerObservable = null;
        this.animateBallTimeout = 60 * 1000;

        this.handlers = {
            // "chat-message": (data: any) => {
            //      logger.log("chat-message", data);
            // },

            "animate": (data: any) => {
                const text = data.username;
                const color = data.args[0];

                this.ballzManager.add(text, color, this.animateBallTimeout);

                // NOTE: fake-phonetic version of "balls".
                this.speechManager.say(`Hey, ${data.username}, you've got baullzzz!`);
            },

            "following": (data: any) => {
                this.followingHandler.handle(data);
            },

            "cheering-with-cheermotes": (data: any) => {
                this.cheeringWithCheermotesHandler.handle(data);
            },

            "subscription": (data: any) => {
                this.subscriptionHandler.handle(data);
            },

            "cowbell": (data: any) => {
                this.soundManager.playRandom("cowbell");
            },

            "say": (data: any) => {
                this.speechManager.say(data.args.join(" "));
            },

            "vidy": (data: any) => {
                this.vidyHandler.handle(data.videoUrl);
            },

            // "message": (data: any) => {
            //     logger.log("message", data);
            // },
        };
    }

    public async start(): Promise<void> {
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
        if (!this.handlers[botEvent.event]) {
            this.logger.error("Missing event handler", botEvent.event);
            return;
        }

        this.handlers[botEvent.event](botEvent.data);
    }
}
