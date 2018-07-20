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

import PackageJsonProvider from "@botten-nappet/shared/src/util/package-json-provider";

@asrt(2)
@inject("IConfig", PackageJsonProvider)
export default class SharedConfig {
    public prefix: string;

    constructor(
        @asrt() private readonly config: IConfig,
        @asrt() private readonly packageJsonProvider: PackageJsonProvider,
    ) {
        this.prefix = "shared";
    }

    @asrt(0)
    public validate(): any {
        // TODO: more dynamic config value list?
        // TODO: add validation error messages.
        assert.nonEmptyString(this.applicationName);
        assert.nonEmptyString(this.version);
        assert.nonEmptyString(this.loggingLevel);
        assert.nonEmptyString(this.loggingFile);
        assert.nonEmptyString(this.zmqXPublisherAddress);
        assert.nonEmptyString(this.zmqXSubscriberAddress);
        assert.nonEmptyString(this.zmqServerPrivateKey);
        assert.nonEmptyString(this.zmqServerPublicKey);
        assert.nonEmptyString(this.zmqClientPrivateKey);
        assert.nonEmptyString(this.zmqClientPublicKey);

        assert.nonEmptyString(this.topicApplicationAuthenticationEvent);
        assert.nonEmptyString(this.topicApplicationUnauthenticationEvent);
        assert.nonEmptyString(this.topicApplicationAuthenticatedEvent);
        assert.nonEmptyString(this.topicApplicationUnauthenticatedEvent);
        assert.nonEmptyString(this.topicUserAuthenticationEvent);
        assert.nonEmptyString(this.topicUserUnauthenticationEvent);
        assert.nonEmptyString(this.topicUserAuthenticatedEvent);
        assert.nonEmptyString(this.topicUserUnauthenticatedEvent);
        assert.nonEmptyString(this.topicTwitchIncomingApplicationAuthenticatedEvent);
        assert.nonEmptyString(this.topicTwitchIncomingApplicationUnauthenticatedEvent);
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

    public get zmqXPublisherAddress(): string {
        const value = this.config.get<string>(`${this.prefix}.zmq.address.xpublisher`);

        assert.nonEmptyString(value);
        assert(value.startsWith("tcp://"));

        return value;
    }

    public get zmqXSubscriberAddress(): string {
        const value = this.config.get<string>(`${this.prefix}.zmq.address.xsubscriber`);

        assert.nonEmptyString(value);
        assert(value.startsWith("tcp://"));

        return value;
    }

    public get zmqServerPrivateKey(): string {
        const value = this.config.get<string>(`${this.prefix}.zmq.keys.server.private`);

        assert.nonEmptyString(value);
        assert.hasLength(value, 40);

        return value;
    }

    public get zmqServerPublicKey(): string {
        const value = this.config.get<string>(`${this.prefix}.zmq.keys.server.public`);

        assert.nonEmptyString(value);
        assert.hasLength(value, 40);

        return value;
    }

    public get zmqClientPrivateKey(): string {
        const value = this.config.get<string>(`${this.prefix}.zmq.keys.client.private`);

        assert.nonEmptyString(value);
        assert.hasLength(value, 40);

        return value;
    }

    public get zmqClientPublicKey(): string {
        const value = this.config.get<string>(`${this.prefix}.zmq.keys.client.public`);

        assert.nonEmptyString(value);
        assert.hasLength(value, 40);

        return value;
    }

    public get topicApplicationAuthenticationEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.application.authenticationEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicApplicationUnauthenticationEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.application.unauthenticationEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicApplicationAuthenticatedEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.application.authenticatedEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicApplicationUnauthenticatedEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.application.unauthenticatedEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicUserAuthenticationEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.user.authenticationEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicUserUnauthenticationEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.user.unauthenticationEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicUserAuthenticatedEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.user.authenticatedEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicUserUnauthenticatedEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.user.unauthenticatedEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingApplicationAuthenticatedEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingApplicationAuthenticatedEvent`);

        assert.nonEmptyString(value);

        return value;
    }

    public get topicTwitchIncomingApplicationUnauthenticatedEvent(): string {
        const value = this.config.get<string>(`${this.prefix}.topic.twitch.incomingApplicationUnauthenticatedEvent`);

        assert.nonEmptyString(value);

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
