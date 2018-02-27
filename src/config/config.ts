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

export default class Config {
    private config: IConfig;

    constructor(config: IConfig) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof config, "object");

        this.config = config;
    }

    public validate(): any {
        // TODO: more dynamic config value list?
        // TODO: add validation error messages.
        assert.nonEmptyString(this.loggingLevel);
        assert.nonEmptyString(this.loggingFile);
        assert.nonEmptyString(this.databaseUri);
        assert.match(this.databaseUri, /^nedb:\/\//);
        assert.nonEmptyString(this.topicTwitchIncomingIrcCommand);
        assert.nonEmptyString(this.topicTwitchOutgoingIrcCommand);
        assert.nonEmptyString(this.twitchAppClientId);
        assert.nonEmptyString(this.twitchAppOAuthRedirectUrl);
        assert.nonEmptyString(this.twitchUserName);
        assert.nonEmptyString(this.twitchChannelName);
        assert.nonEmptyString(this.zmqAddress);
    }

    public get loggingLevel(): string {
        const value = this.config.get<string>("loggingLevel");

        assert.nonEmptyString(value);

        return value;
    }

    public get loggingFile(): string {
        const value = this.config.get<string>("loggingFile");

        assert.nonEmptyString(value);

        return value;
    }

    public get databaseUri(): string {
        const value = this.config.get<string>("databaseUri");

        assert.nonEmptyString(value);
        assert(value.startsWith, "nedb://");

        return value;
    }

    public get topicTwitchIncomingIrcCommand(): string {
        const value = this.config.get<string>("topicTwitchIncomingIrcCommand");

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchOutgoingIrcCommand(): string {
        const value = this.config.get<string>("topicTwitchOutgoingIrcCommand");

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchAppClientId(): string {
        const value = this.config.get<string>("twitchAppClientId");

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchAppClientSecret(): string {
        const value = this.config.get<string>("twitchAppClientSecret");

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchAppOAuthRedirectUrl(): string {
        const value = this.config.get<string>("twitchAppOAuthRedirectUrl");

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchUserName(): string {
        const value = this.config.get<string>("twitchUserName");

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchChannelName(): string {
        // NOTE: assuming that the user only joins their own channel, with a "#" prefix.
        const value = `#${this.twitchUserName}`;

        return value;
    }

    public get bottenNappetDefaultPollingInterval(): number {
        const value = this.config.get<number>("bottenNappetDefaultPollingInterval");

        assert.greater(value, 0);

        return value;
    }

    public get twitchOAuthTokenUri(): string {
        const value = this.config.get<string>("twitchOAuthTokenUri");

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchOAuthTokenRevocationUri(): string {
        const value = this.config.get<string>("twitchOAuthTokenRevocationUri");

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchOAuthAuthorizationUri(): string {
        const value = this.config.get<string>("twitchOAuthAuthorizationUri");

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchOAuthTokenVerificationUri(): string {
        const value = this.config.get<string>("twitchOAuthTokenVerificationUri");

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchUsersDataUri(): string {
        const value = this.config.get<string>("twitchUsersDataUri");

        assert.nonEmptyString(value);
        assert(value.startsWith("https://"));

        return value;
    }

    public get twitchPubSubWebSocketUri(): string {
        const value = this.config.get<string>("twitchPubSubWebSocketUri");

        assert.nonEmptyString(value);
        assert(value.startsWith("wss://"));

        return value;
    }

    public get twitchIrcWebSocketUri(): string {
        const value = this.config.get<string>("twitchIrcWebSocketUri");

        assert.nonEmptyString(value);
        assert(value.startsWith("wss://"));

        return value;
    }

    public get followingPollingLimit(): number {
        const value = this.config.get<number>("followingPollingLimit");

        assert.greater(value, 0);

        return value;
    }

    public get twitchAppTokenRefreshInterval(): number {
        const value = this.config.get<number>("twitchAppTokenRefreshInterval");

        assert.greater(value, 0);

        return value;
    }

    public get applicationName(): string {
        const value = this.config.get<string>("applicationName");

        assert.nonEmptyString(value);

        return value;
    }

    public get twitchAppScopes(): string[] {
        const value = this.config.get<string[]>("twitchAppScopes");

        assert.nonEmptyArray(value);

        return value;
    }

    public get zmqAddress(): string {
        const value = this.config.get<string>("zmqAddress");

        assert.nonEmptyString(value);
        assert(value.startsWith("tcp://"));

        return value;
    }
}
