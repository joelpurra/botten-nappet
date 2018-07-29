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
    scoped,
} from "@botten-nappet/backend-shared/lib/dependency-injection/scoped/scoped";
import {
    asrt,
} from "@botten-nappet/shared/src/util/asrt";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import StartablesManager from "@botten-nappet/shared/src/startable-stoppable/startables-manager";

/* tslint:disable max-line-length */

import IncomingCheermotesCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-cheermotes-event-translator";
import IncomingFollowingCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-following-event-translator";
import IncomingStreamingCommandEventTranslator from "@botten-nappet/backend-twitch/src/translator/incoming-streaming-event-translator";

import TwitchUserIdProvider from "@botten-nappet/backend-twitch/src/authentication/user-id-provider";
import TwitchUserNameProvider from "@botten-nappet/backend-twitch/src/authentication/user-name-provider";

/* tslint:enable max-line-length */

@asrt(6)
export default class TwitchPerUserPollingApi extends StartablesManager {
    protected logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() @scoped(IncomingFollowingCommandEventTranslator)
        private readonly twitchIncomingFollowingCommandEventTranslator: IncomingFollowingCommandEventTranslator,
        @asrt() @scoped(IncomingStreamingCommandEventTranslator)
        private readonly twitchIncomingStreamingCommandEventTranslator: IncomingStreamingCommandEventTranslator,
        @asrt() @scoped(IncomingCheermotesCommandEventTranslator)
        private readonly twitchIncomingCheermotesCommandEventTranslator: IncomingCheermotesCommandEventTranslator,
        @asrt() private readonly twitchUserNameProvider: TwitchUserNameProvider,
        @asrt() private readonly twitchUserIdProvider: TwitchUserIdProvider,
    ) {
        super();

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async loadStartables(): Promise<void> {
        this.startables.push(this.twitchIncomingFollowingCommandEventTranslator);
        this.startables.push(this.twitchIncomingStreamingCommandEventTranslator);
        this.startables.push(this.twitchIncomingCheermotesCommandEventTranslator);
    }

    @asrt(0)
    public async managedStart(): Promise<void> {
        this.logger.info({
            twitchUserId: await this.twitchUserIdProvider.get(),
            twitchUserName: await this.twitchUserNameProvider.get(),
        }, "Started listening to events");
    }

    @asrt(0)
    public async managedStop(): Promise<void> {
        // NOTE: empty.
    }
}
