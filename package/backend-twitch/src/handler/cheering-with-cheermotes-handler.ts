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

import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";
import MultiEventSubscriptionManager from "@botten-nappet/shared/src/event/multi-event-subscription-manager";

/* tslint:disable max-line-length */

import ApplicationTokenManagerConfig from "@botten-nappet/backend-twitch/src/config/application-token-manager-config";
import {
    ICheerToken,
    ICheerTokenWithCheermoteUrl,
} from "@botten-nappet/interface-shared-twitch/src/event/icheertoken-with-cheermotes-url";
import IIncomingCheeringEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheering-event";
import IIncomingCheeringWithCheermotesEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheering-with-cheermotes-event";
import IIncomingCheermotesEvent from "@botten-nappet/interface-shared-twitch/src/event/iincoming-cheermotes-event";
import {
    asrt,
} from "@botten-nappet/shared/src/util/asrt";

import {
    CheermoteBackground,
    CheermoteImageType,
} from "@botten-nappet/backend-twitch/src/interface/response/polling/itwitch-api-v5-channel-cheermotes";

/* tslint:enable max-line-length */

@asrt(4)
export default class CheeringWithCheermotesHandler
    extends MultiEventSubscriptionManager<IIncomingCheeringEvent | IIncomingCheermotesEvent> {
    public cheerTokenPrefixAmountRx: RegExp;
    public currentCheermotes: IIncomingCheermotesEvent | null;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connections: Array<IEventSubscriptionConnection<IIncomingCheeringEvent | IIncomingCheermotesEvent>>,
        @asrt() private incomingCheeringWithCheermotesEvent: IEventEmitter<IIncomingCheeringWithCheermotesEvent>,
        @asrt() private readonly applicationTokenManagerConfig: ApplicationTokenManagerConfig,
    ) {
        super(logger, connections);

        this.logger = logger.child(this.constructor.name);

        // NOTE: expecting to collect data from a single channel event source, but not verifying that the
        // channel doesn't change over time and/or per command.
        this.currentCheermotes = null;

        this.cheerTokenPrefixAmountRx = /(\w+?)(\d+)/;
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IIncomingCheeringEvent | IIncomingCheermotesEvent,
    ): Promise<void> {
        if (this.isIIncomingCheermotesEvent(data)) {
            this.currentCheermotes = data;

            return;
        }

        if (this.isIIncomingCheeringEvent(data)) {
            if (!this.currentCheermotes) {
                this.logger.warn("No cheermotes found, skipping emitting IIncomingCheeringWithCheermotesEvent.");

                return;
            }

            const matchingCheermotes = this.getMatchingCheermotes(data);
            const background = "dark";
            const imageType = "animated";
            const matchingCheermotesWithImageUrls = this.addCheermoteUrls(matchingCheermotes, background, imageType);

            const event: IIncomingCheeringWithCheermotesEvent = {
                application: {
                    // TODO: create a class/builder for the twitch application object.
                    id: this.applicationTokenManagerConfig.appClientId,
                    name: "twitch",
                },
                channel: data.channel,
                data: {
                    badge: data.data.badge,
                    bits: data.data.bits,
                    cheermotes: matchingCheermotesWithImageUrls,
                    message: data.data.message,
                    total: data.data.total,
                },
                interfaceName: "IIncomingCheeringWithCheermotesEvent",
                timestamp: new Date(),
                triggerer: data.triggerer,
            };

            this.incomingCheeringWithCheermotesEvent.emit(event);

            return;
        }

        throw new Error(`Unknown data object: ${Object.keys(data)}`);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IIncomingCheeringEvent | IIncomingCheermotesEvent,
    ): Promise<boolean> {
        if (this.isIIncomingCheermotesEvent(data)) {
            return true;
        }

        if (this.isIIncomingCheeringEvent(data)) {
            return true;
        }

        throw new Error("Unknown event type");
    }

    @asrt(1)
    private getMatchingCheermotes(
        @asrt() incomingCheeringEvent: IIncomingCheeringEvent,
    ): ICheerToken[] {
        // TODO: use asserts.
        if (!this.currentCheermotes) {
            throw new Error("this.currentCheermotes");
        }

        // TODO: use asserts.
        if (!incomingCheeringEvent.data.message) {
            throw new Error("this.currentCheermotes");
        }

        const messageTokens = incomingCheeringEvent.data.message.split(/\s+/);
        const possibleCheerTokens = messageTokens
            .filter((messageToken) => this.cheerTokenPrefixAmountRx.test(messageToken))
            .map((cheerToken) => {
                const matches = this.cheerTokenPrefixAmountRx.exec(cheerToken);

                if (!matches) {
                    throw new Error("No matches found.");
                }

                const result = {
                    amount: parseInt(matches[2], 10),
                    prefix: matches[1],
                };

                return result;
            });

        const currentCheermotesPrefixes = this.currentCheermotes.data.cheermotes.actions
            .map((action) => action.prefix)
            .map((prefix) => prefix.toLowerCase());

        const matchingCheerTokens = possibleCheerTokens.filter((possibleCheerToken) => {
            const isMatch = currentCheermotesPrefixes.includes(possibleCheerToken.prefix);

            return isMatch;
        });

        return matchingCheerTokens;
    }

    @asrt(3)
    private addCheermoteUrls(
        @asrt() cheerTokens: ICheerToken[],
        @asrt() cheermoteBackground: CheermoteBackground,
        @asrt() cheermoteImageType: CheermoteImageType,
    ): ICheerTokenWithCheermoteUrl[] {
        // TODO: use asserts.
        if (!this.currentCheermotes) {
            throw new Error("this.currentCheermotes");
        }

        const cheerTokensWithCheermoteUrl = cheerTokens.map((cheerToken) => {
            // TODO: use asserts.
            if (!this.currentCheermotes) {
                throw new Error("this.currentCheermotes");
            }

            const actionsWithPrefix = this.currentCheermotes.data.cheermotes.actions
                .filter((action) => action.prefix.toLowerCase() === cheerToken.prefix.toLowerCase());

            const actionWithPrefix = actionsWithPrefix[0];

            // NOTE: copy to mutate.
            const scales = actionWithPrefix.scales.slice(0);
            scales.sort();
            const largestScale = scales.reverse()[0];
            assert.greater(largestScale.length, 0);

            const matchingTiers = actionWithPrefix.tiers.filter((tier) => tier.min_bits <= cheerToken.amount);
            matchingTiers.sort((a, b) => {
                if (a.min_bits === b.min_bits) {
                    return 0;
                }

                if (a.min_bits < b.min_bits) {
                    return -1;
                }

                return 1;
            });
            const greatestMatchingTier = matchingTiers.reverse()[0];

            const url = greatestMatchingTier.images[cheermoteBackground][cheermoteImageType][largestScale];

            const cheerTokenWithCheermoteUrl: ICheerTokenWithCheermoteUrl = {
                cheerToken,
                url,
            };

            return cheerTokenWithCheermoteUrl;
        });

        return cheerTokensWithCheermoteUrl;
    }

    @asrt(1)
    private isIIncomingCheermotesEvent(
        @asrt() data: any,
    ): data is IIncomingCheermotesEvent {
        const isMatch = (
            data
            && data.interfaceName === "IIncomingCheermotesEvent"
            && data.data.cheermotes
            && typeof data.data.cheermotes === "object"
            && Array.isArray(data.data.cheermotes.actions)
        );

        return isMatch;
    }

    @asrt(1)
    private isIIncomingCheeringEvent(
        @asrt() data: any,
    ): data is IIncomingCheeringEvent {
        const isMatch = (
            data
            && data.interfaceName === "IIncomingCheeringEvent"
            && typeof data.data.message === "string"
            && typeof data.data.bits === "number"
            && typeof data.data.total === "number"
        );

        return isMatch;
    }
}
