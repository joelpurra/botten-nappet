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

import {
    IConfig,
} from "config";

import IZmqConfig from "@botten-nappet/shared/util/izmq-config";

export default class Config implements IZmqConfig {
    private sharedPrefix: string;
    private prefix: string;

    constructor(
        private readonly config: IConfig,
    ) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof config, "object");

        this.sharedPrefix = "shared";
        this.prefix = "frontend";
    }

    public validate(): any {
        // TODO: more dynamic config value list?
        // TODO: add validation error messages.
        assert.nonEmptyString(this.staticPublicRootDirectory);
        assert.nonEmptyString(this.topicTwitchIncomingFollowingEvent);
        assert.nonEmptyString(this.topicTwitchIncomingCheeringWithCheermotesEvent);
        assert.nonEmptyString(this.topicTwitchIncomingCheeringEvent);
        assert.nonEmptyString(this.topicTwitchIncomingCheermotesEvent);
        assert.nonEmptyString(this.topicTwitchIncomingSubscriptionEvent);
        assert.integer(this.port);
        assert.positive(this.port);
        assert.nonEmptyString(this.zmqAddress);
    }

    public get staticPublicRootDirectory(): string {
        const value = this.config.get<string>(`${this.prefix}.static.publicRootDirectory`);

        assert.nonEmptyString(value);

        return value;
    }

    public get port(): number {
        const value = this.config.get<number>(`${this.prefix}.port`);

        assert.integer(value);
        assert.positive(value);

        return value;
    }

    public get topicTwitchIncomingFollowingEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingFollowingEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingCheeringWithCheermotesEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingCheeringWithCheermotesEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingCheeringEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingCheeringEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingCheermotesEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingCheermotesEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingSubscriptionEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingSubscriptionEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicVidyOutgoingSearchCommand(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.vidy.outgoingSearchCommand`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicVidyIncomingSearchResultEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.vidy.incomingSearchResultEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get zmqAddress(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.zmqAddress`);

        assert.nonEmptyString(value);
        assert(value.startsWith("tcp://"));

        return value;
    }
}
