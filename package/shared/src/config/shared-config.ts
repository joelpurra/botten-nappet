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
    inject,
} from "aurelia-dependency-injection";
import {
    assert,
} from "check-types";

import {
    IConfig,
} from "config";

import PackageJsonProvider from "@botten-nappet/shared/src/util/package-json-provider";

@inject("IConfig", PackageJsonProvider)
export default class SharedConfig {
    public prefix: string;

    constructor(
        private readonly config: IConfig,
        private readonly packageJsonProvider: PackageJsonProvider,
    ) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof config, "object");
        assert.equal(typeof packageJsonProvider, "object");

        this.prefix = "shared";
    }

    public validate(): any {
        // TODO: more dynamic config value list?
        // TODO: add validation error messages.
        assert.nonEmptyString(this.applicationName);
        assert.nonEmptyString(this.version);
        assert.nonEmptyString(this.loggingLevel);
        assert.nonEmptyString(this.loggingFile);
        assert.nonEmptyString(this.zmqAddress);

        assert.nonEmptyString(this.topicTwitchIncomingFollowingEvent);
        assert.nonEmptyString(this.topicTwitchIncomingCheeringWithCheermotesEvent);
        assert.nonEmptyString(this.topicVidyOutgoingSearchCommand);
        assert.nonEmptyString(this.topicVidyIncomingSearchResultEvent);
        assert.nonEmptyString(this.topicTwitchIncomingStreamingEvent);
        assert.nonEmptyString(this.topicTwitchIncomingCheermotesEvent);
        assert.nonEmptyString(this.topicTwitchIncomingCheeringEvent);
        assert.nonEmptyString(this.topicTwitchIncomingWhisperEvent);
        assert.nonEmptyString(this.topicTwitchIncomingSubscriptionEvent);
    }

    public get applicationName(): string {
        const value = this.config.get<string>(`${this.prefix}.applicationName`);

        assert.nonEmptyString(value);

        return value;
    }

    public get version(): string {
        const value = this.packageJsonProvider.version;

        assert.nonEmptyString(value);

        return value;
    }

    public get loggingLevel(): string {
        const value = this.config.get<string>(`${this.prefix}.logging.level`);

        assert.nonEmptyString(value);

        return value;
    }

    public get loggingFile(): string {
        const value = this.config.get<string>(`${this.prefix}.logging.file`);

        assert.nonEmptyString(value);

        return value;
    }

    public get zmqAddress(): string {
        const value = this.config.get<string>(`${this.prefix}.zmqAddress`);

        assert.nonEmptyString(value);
        assert(value.startsWith("tcp://"));

        return value;
    }

    public get topicTwitchIncomingFollowingEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingFollowingEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingCheeringWithCheermotesEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingCheeringWithCheermotesEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicVidyOutgoingSearchCommand(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.vidy.outgoingSearchCommand`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicVidyIncomingSearchResultEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.vidy.incomingSearchResultEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingStreamingEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingStreamingEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingCheermotesEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingCheermotesEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingCheeringEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingCheeringEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingWhisperEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingWhisperEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingSubscriptionEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingSubscriptionEvent`);

        assert.nonEmptyString(value);

        return value;
    }
}
