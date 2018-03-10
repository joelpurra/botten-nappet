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

import IEventEmitter from "../../../../../shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "../../../../../shared/src/event/ievent-subscription-connection";
import MultiEventSubscriptionManager from "../../../../../shared/src/event/multi-event-subscription-manager";
import PinoLogger from "../../../../../shared/src/util/pino-logger";
import IIncomingCheeringEvent from "../event/iincoming-cheering-event";
import IIncomingCheeringWithCheermotesEvent from "../event/iincoming-cheering-with-cheermotes-event";
import IIncomingCheermotesEvent from "../event/iincoming-cheermotes-event";
import {
    ICheerToken,
    ICheerTokenWithCheermoteUrl,
} from "./icheertoken-with-cheermotes-url";
import {
    CheermoteBackground,
    CheermoteImageType,
} from "./itwitch-api-v5-channel-cheermotes";

export default class CheeringWithCheermotesHandler
    extends MultiEventSubscriptionManager<IIncomingCheeringEvent | IIncomingCheermotesEvent> {
    public cheerTokenPrefixAmountRx: RegExp;
    public currentCheermotes: IIncomingCheermotesEvent | null;
    private incomingCheeringWithCheermotesEvent: IEventEmitter<IIncomingCheeringWithCheermotesEvent>;

    constructor(
        logger: PinoLogger,
        connections: Array<IEventSubscriptionConnection<IIncomingCheeringEvent | IIncomingCheermotesEvent>>,
        incomingCheeringWithCheermotesEvent: IEventEmitter<IIncomingCheeringWithCheermotesEvent>,
    ) {
        super(logger, connections);

        assert.hasLength(arguments, 3);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connections, "object");
        assert.equal(typeof incomingCheeringWithCheermotesEvent, "object");

        this.incomingCheeringWithCheermotesEvent = incomingCheeringWithCheermotesEvent;

        this.logger = logger.child("CheeringWithCheermotesHandler");

        // NOTE: expecting to collect data from a single channel event source, but not verifying that the
        // channel doesn't change over time and/or per command.
        this.currentCheermotes = null;

        this.cheerTokenPrefixAmountRx = /(\w+?)(\d+)/;
    }

    protected async dataHandler(data: IIncomingCheeringEvent | IIncomingCheermotesEvent): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        this.logger.trace(data, "dataHandler");

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
                badge: data.badge,
                bits: data.bits,
                channel: data.channel,
                cheermotes: matchingCheermotesWithImageUrls,
                message: data.message,
                timestamp: data.timestamp,
                total: data.total,
                triggerer: data.triggerer,
            };

            this.incomingCheeringWithCheermotesEvent.emit(event);

            return;
        }

        throw new Error(`Unknown data object: ${Object.keys(data)}`);
    }

    protected async filter(data: IIncomingCheeringEvent | IIncomingCheermotesEvent): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (this.isIIncomingCheermotesEvent(data)) {
            return true;
        }

        if (this.isIIncomingCheeringEvent(data)) {
            return true;
        }

        return false;
    }

    private getMatchingCheermotes(incomingCheeringEvent: IIncomingCheeringEvent): ICheerToken[] {
        // TODO: use asserts.
        if (!this.currentCheermotes) {
            throw new Error("this.currentCheermotes");
        }

        // TODO: use asserts.
        if (!incomingCheeringEvent.message) {
            throw new Error("this.currentCheermotes");
        }

        const messageTokens = incomingCheeringEvent.message.split(/\s+/);
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

        const currentCheermotesPrefixes = this.currentCheermotes.cheermotes.actions
            .map((action) => action.prefix)
            .map((prefix) => prefix.toLowerCase());

        const matchingCheerTokens = possibleCheerTokens.filter((possibleCheerToken) => {
            const isMatch = currentCheermotesPrefixes.includes(possibleCheerToken.prefix);

            return isMatch;
        });

        return matchingCheerTokens;
    }

    private addCheermoteUrls(
        cheerTokens: ICheerToken[],
        cheermoteBackground: CheermoteBackground,
        cheermoteImageType: CheermoteImageType,
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

            const actionsWithPrefix = this.currentCheermotes.cheermotes.actions
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

    private isIIncomingCheermotesEvent(
        data: any,
    ): data is IIncomingCheermotesEvent {
        const isMatch = (
            data
            && data.cheermotes
            && typeof data.cheermotes === "object"
            && Array.isArray(data.cheermotes.actions)
        );

        return isMatch;
    }

    private isIIncomingCheeringEvent(
        data: any,
    ): data is IIncomingCheeringEvent {
        const isMatch = (
            data
            && typeof data.message === "string"
            && typeof data.bits === "number"
            && typeof data.total === "number"
        );

        return isMatch;
    }
}
