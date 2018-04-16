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
    private packageJson: any;
    private sharedPrefix: string;
    private prefix: string;
    private config: IConfig;

    constructor(config: IConfig, packageJson: any) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof config, "object");
        // TODO: import type for package.json.
        assert.equal(typeof packageJson, "object");

        this.config = config;
        this.packageJson = packageJson;

        this.sharedPrefix = "shared";
        this.prefix = "backend";
    }

    public validate(): any {
        // TODO: more dynamic config value list?
        // TODO: add validation error messages.
        assert.nonEmptyString(this.databaseUri);
        assert.match(this.databaseUri, /^nedb:\/\//);
        assert.nonEmptyString(this.topicTwitchIncomingIrcCommand);
        assert.nonEmptyString(this.topicTwitchOutgoingIrcCommand);
        assert.nonEmptyString(this.topicTwitchIncomingPubSubEvent);
        assert.nonEmptyString(this.topicTwitchIncomingCheeringEvent);
        assert.nonEmptyString(this.topicTwitchIncomingWhisperEvent);
        assert.nonEmptyString(this.topicTwitchIncomingCheeringWithCheermotesEvent);
        assert.nonEmptyString(this.topicTwitchIncomingStreamingEvent);
        assert.nonEmptyString(this.topicTwitchIncomingCheermotesEvent);
        assert.nonEmptyString(this.topicTwitchIncomingSubscriptionEvent);
        assert.integer(this.bottenNappetDefaultPollingInterval);
        assert.positive(this.bottenNappetDefaultPollingInterval);
        assert.integer(this.bottenNappetStreamingPollingInterval);
        assert.positive(this.bottenNappetStreamingPollingInterval);
        assert.integer(this.bottenNappetCheermotesPollingInterval);
        assert.positive(this.bottenNappetCheermotesPollingInterval);
        assert.nonEmptyString(this.twitchAppClientId);
        assert.nonEmptyString(this.twitchAppOAuthRedirectUrl);
        assert.nonEmptyString(this.twitchUserName);
        assert.nonEmptyString(this.twitchChannelName);
        assert.nonEmptyString(this.zmqAddress);
        assert.nonEmptyString(this.applicationName);
        assert.nonEmptyString(this.version);
        assert.nonEmptyString(this.vidyRootUrl);
        assert.nonEmptyString(this.vidyVideoLinkBaseUrl);
        assert.nonEmptyString(this.vidyKeyId);
        assert.nonEmptyString(this.vidyKeySecret);
        assert.nonEmptyString(this.vidySystemUuid);
    }

    public get databaseUri(): string {
        const value = this.config.get<string>(`${this.prefix}.databaseUri`);

        assert.nonEmptyString(value);
        assert(value.startsWith, "nedb://");

        return value;
    }

    public get topicTwitchIncomingIrcCommand(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingIrcCommand`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchOutgoingIrcCommand(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.outgoingIrcCommand`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingPubSubEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingPubSubEvent`);

        assert.nonEmptyString(value);

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

    public get topicTwitchIncomingStreamingEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingStreamingEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingCheermotesEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingCheermotesEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingCheeringEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingCheeringEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingWhisperEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingWhisperEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingSubscriptionEvent(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.topic.twitch.incomingSubscriptionEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchAppClientId(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.appClientId`);

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchAppClientSecret(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.appClientSecret`);

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchAppOAuthRedirectUrl(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.appOAuthRedirectUrl`);

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchUserName(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.userName`);

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchChannelName(): string {
        // NOTE: assuming that the user only joins their own channel, with a "#" prefix.
        const value = `#${this.twitchUserName}`;

        return value;
    }

    public get bottenNappetDefaultPollingInterval(): number {
        const value = this.config.get<number>(`${this.prefix}.pollingInterval.default`);

        assert.greater(value, 0);

        return value;
    }

    public get bottenNappetStreamingPollingInterval(): number {
        const value = this.config.get<number>(`${this.prefix}.pollingInterval.streaming`);

        assert.greater(value, 0);

        return value;
    }

    public get bottenNappetCheermotesPollingInterval(): number {
        const value = this.config.get<number>(`${this.prefix}.pollingInterval.cheermotes`);

        assert.greater(value, 0);

        return value;
    }

    public get twitchOAuthTokenUri(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.oauthTokenUri`);

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchOAuthTokenRevocationUri(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.oauthTokenRevocationUri`);

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchOAuthAuthorizationUri(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.oauthAuthorizationUri`);

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchOAuthTokenVerificationUri(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.oauthTokenVerificationUri`);

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchUsersDataUri(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.usersDataUri`);

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchPubSubWebSocketUri(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.pubSubWebSocketUri`);

        assert.nonEmptyString(value);
        assert(value.startsWith("wss://"));

        return value;
    }

    public get twitchIrcWebSocketUri(): string {
        const value = this.config.get<string>(`${this.prefix}.twitch.ircWebSocketUri`);

        assert.nonEmptyString(value);
        assert(value.startsWith("wss://"));

        return value;
    }

    public get followingPollingLimit(): number {
        const value = this.config.get<number>(`${this.prefix}.followingPollingLimit`);

        assert.greater(value, 0);

        return value;
    }

    public get twitchAppTokenRefreshInterval(): number {
        const value = this.config.get<number>(`${this.prefix}.twitch.appTokenRefreshInterval`);

        assert.greater(value, 0);

        return value;
    }

    public get twitchAppScopes(): string[] {
        const value = this.config.get<string[]>(`${this.prefix}.twitch.appScopes`);

        assert.nonEmptyArray(value);

        return value;
    }

    public get zmqAddress(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.zmqAddress`);

        assert.nonEmptyString(value);
        assert(value.startsWith("tcp://"));

        return value;
    }

    public get applicationName(): string {
        const value = this.config.get<string>(`${this.sharedPrefix}.applicationName`);

        assert.nonEmptyString(value);

        return value;
    }

    public get version(): string {
        const value = this.packageJson.version;

        assert.nonEmptyString(value);

        return value;
    }

    public get vidyRootUrl(): string {
        const value = this.config.get<string>(`${this.prefix}.vidy.rootUrl`);

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));
        assert(value.endsWith("/"));

        return value;
    }

    public get vidyVideoLinkBaseUrl(): string {
        const value = this.config.get<string>(`${this.prefix}.vidy.videoLinkBaseUrl`);

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));
        assert(value.endsWith("/"));

        return value;
    }

    public get vidyKeyId(): string {
        const value = this.config.get<string>(`${this.prefix}.vidy.keyId`);

        assert.nonEmptyString(value);

        return value;
    }

    public get vidyKeySecret(): string {
        const value = this.config.get<string>(`${this.prefix}.vidy.keySecret`);

        assert.nonEmptyString(value);

        return value;
    }

    public get vidySystemUuid(): string {
        const value = this.config.get<string>(`${this.prefix}.vidy.systemUuid`);

        assert.nonEmptyString(value);

        return value;
    }
}
