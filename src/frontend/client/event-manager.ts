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
import CheeringHandler from "./cheering-handler";
import ConsoleLog from "./console-log";
import FollowingHandler from "./following-handler";
import SoundManager from "./sound-manager";
import SubscriptionHandler from "./subscription-handler";
import { deepParseIso8601UtcDates } from "./utilities";

export default class EventManager {
    private dataHandlerSubscription: Rx.Subscription | null;
    private handlerObservable: Rx.Observable<any> | null;
    private handlers: {
        [key: string]: (data: any) => void;
    };
    private ballzManager: BallzManager;
    private subscriptionHandler: SubscriptionHandler;
    private cheeringHandler: CheeringHandler;
    private followingHandler: FollowingHandler;
    private soundManager: SoundManager;
    private botSocket: BotSocket;
    private logger: ConsoleLog;

    constructor(
        logger: ConsoleLog,
        botSocket: BotSocket,
        soundManager: SoundManager,
        followingHandler: FollowingHandler,
        cheeringHandler: CheeringHandler,
        subscriptionHandler: SubscriptionHandler,
        ballzManager: BallzManager,
    ) {
        this.logger = logger;
        this.botSocket = botSocket;
        this.soundManager = soundManager;
        this.followingHandler = followingHandler;
        this.cheeringHandler = cheeringHandler;
        this.subscriptionHandler = subscriptionHandler;
        this.ballzManager = ballzManager;

        this.dataHandlerSubscription = null;
        this.handlerObservable = null;

        this.handlers = {
            // "chat-message": (data: any) => {
            //      logger.log("chat-message", data);
            // },

            animate: (data: any) => {
                const text = data.username;
                const color = data.args[0];

                this.ballzManager.add(text, color);
            },

            following: (data: any) => {
                this.followingHandler.handle(data);
            },

            cheering: (data: any) => {
                this.cheeringHandler.handle(data);
            },

            subscription: (data: any) => {
                this.subscriptionHandler.handle(data);
            },

            cowbell: (data: any) => {
                this.soundManager.playRandom("cowbell");
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
