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

import Rx, {
    NextObserver,
} from "rxjs";
import {
    map,
} from "rxjs/operators";

import BallzManager from "@botten-nappet/client-shared/src/ballz-manager";
import BotSocket from "@botten-nappet/client-shared/src/bot-socket";
import CheeringWithCheermotesHandler from "@botten-nappet/client-shared/src/cheering-with-cheermotes-handler";
import {
    isValidColor,
} from "@botten-nappet/client-shared/src/colors";
import ConsoleLog from "@botten-nappet/client-shared/src/console-log";
import FollowingHandler from "@botten-nappet/client-shared/src/following-handler";
import SoundManager from "@botten-nappet/client-shared/src/sound-manager";
import SubscriptionHandler from "@botten-nappet/client-shared/src/subscription-handler";
import {
    deepParseIso8601UtcDates,
} from "@botten-nappet/client-shared/src/utilities";

import VidyHandler from "@botten-nappet/client-shared/src/vidy-handler";

export default class ObsEventManager {
    private animateBallTimeout: number;
    private dataHandlerSubscription: Rx.Subscription | null;
    private handlerObservable: Rx.Observable<any> | null;
    private handlers: {
        [key: string]: (data: any) => void;
    };

    constructor(
        private readonly logger: ConsoleLog,
        private readonly botSocket: BotSocket,
        private readonly soundManager: SoundManager,
        private readonly followingHandler: FollowingHandler,
        private readonly cheeringWithCheermotesHandler: CheeringWithCheermotesHandler,
        private readonly subscriptionHandler: SubscriptionHandler,
        private readonly ballzManager: BallzManager,
        private readonly vidyHandler: VidyHandler,
    ) {
        // TODO: share this code.
        this.dataHandlerSubscription = null;
        this.handlerObservable = null;
        this.animateBallTimeout = 60 * 1000;

        this.handlers = {
            // "chat-message": (data: any) => {
            //      logger.log("chat-message", data);
            // },

            "animate": (data: any) => {
                const text = data.username;
                const color = data.color;

                if (!isValidColor(color)) {
                    throw new Error("color");
                }

                this.ballzManager.add(text, color, this.animateBallTimeout);
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

            "vidy": (data: any) => {
                this.vidyHandler.handle(data.videoUrl);
            },

            // "message": (data: any) => {
            //     logger.log("message", data);
            // },
        };
    }

    public async start(): Promise<void> {
        this.botSocket.dataObservable
            .forEach((botEvent) => {
                this.logger.log("botEvent", botEvent);
            });

        // TODO: share this code.
        this.handlerObservable = this.botSocket.dataObservable
            .pipe(map((botEvent) => {
                return deepParseIso8601UtcDates(botEvent);
            }));

        this.handlerObservable
            .forEach((botEvent) => {
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
}
