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
    autoinject,
} from "aurelia-dependency-injection";
import {
    assert,
} from "check-types";

import SharedConfig from "./shared-config";

@autoinject
export default class SharedTopicsConfig {
    constructor(
        private readonly sharedConfig: SharedConfig,
    ) {
        assert.hasLength(arguments, 1);
        assert.equal(typeof sharedConfig, "object");
    }

    public get topicTwitchIncomingFollowingEvent(): string {
        return this.sharedConfig.topicTwitchIncomingFollowingEvent;
    }

    public get topicTwitchIncomingCheeringWithCheermotesEvent(): string {
        return this.sharedConfig.topicTwitchIncomingCheeringWithCheermotesEvent;
    }

    public get topicVidyOutgoingSearchCommand(): string {
        return this.sharedConfig.topicVidyOutgoingSearchCommand;
    }

    public get topicVidyIncomingSearchResultEvent(): string {
        return this.sharedConfig.topicVidyIncomingSearchResultEvent;
    }

    public get topicTwitchIncomingStreamingEvent(): string {
        return this.sharedConfig.topicTwitchIncomingStreamingEvent;
    }

    public get topicTwitchIncomingCheermotesEvent(): string {
        return this.sharedConfig.topicTwitchIncomingCheermotesEvent;
    }

    public get topicTwitchIncomingCheeringEvent(): string {
        return this.sharedConfig.topicTwitchIncomingCheeringEvent;
    }

    public get topicTwitchIncomingWhisperEvent(): string {
        return this.sharedConfig.topicTwitchIncomingWhisperEvent;
    }

    public get topicTwitchIncomingSubscriptionEvent(): string {
        return this.sharedConfig.topicTwitchIncomingSubscriptionEvent;
    }
}
