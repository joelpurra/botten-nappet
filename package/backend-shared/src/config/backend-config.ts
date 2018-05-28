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
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
import {
    inject,
} from "aurelia-dependency-injection";
import {
    assert,
} from "check-types";

import {
    IConfig,
} from "config";

@asrt(1)
@inject("IConfig")
export default class BackendConfig {
    private prefix: string;

    constructor(
        @asrt() private readonly config: IConfig,
    ) {
        this.prefix = "backend";
    }

    @asrt(0)
    public validate(): any {
        // TODO: more dynamic config value list?
        // TODO: add validation error messages.
        assert.nonEmptyString(this.databaseUri);
        assert.match(this.databaseUri, /^nedb:\/\//);
        assert.nonEmptyString(this.topicTwitchOutgoingApplicationAuthenticationCommand);
        assert.nonEmptyString(this.topicTwitchOutgoingApplicationUnauthenticationCommand);
        assert.nonEmptyString(this.topicTwitchOutgoingUserAuthenticationCommand);
        assert.nonEmptyString(this.topicTwitchOutgoingUserUnauthenticationCommand);
        assert.nonEmptyString(this.topicTwitchIncomingIrcCommand);
        assert.nonEmptyString(this.topicTwitchOutgoingIrcCommand);
        assert.nonEmptyString(this.topicTwitchIncomingPubSubEvent);
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

    public get topicTwitchOutgoingApplicationAuthenticationCommand(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.outgoingApplicationAuthenticationCommand`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchOutgoingApplicationUnauthenticationCommand(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.outgoingApplicationUnauthenticationCommand`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchOutgoingUserAuthenticationCommand(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.outgoingUserAuthenticationCommand`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchOutgoingUserUnauthenticationCommand(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.outgoingUserUnauthenticationCommand`);

        assert.nonEmptyString(value);

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
