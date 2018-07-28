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
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";
import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";

import IIncomingSearchResultEvent from "@botten-nappet/interface-shared-vidy/src/event/iincoming-search-result-event";
import IOutgoingSearchCommand from "@botten-nappet/interface-shared-vidy/src/event/ioutgoing-search-command";

import AuthenticatedRequest from "@botten-nappet/backend-vidy/src/request/authenticated-request";

@asrt(5)
export default class OutgoingSearchCommandHandler extends EventSubscriptionManager<IOutgoingSearchCommand> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IOutgoingSearchCommand>,
        @asrt() private incomingSearchResultEventEmitter: IEventEmitter<IIncomingSearchResultEvent>,
        @asrt() private readonly authenticatedRequest: AuthenticatedRequest,
        @asrt() private readonly vidyRootUrl: string,
    ) {
        super(logger, connection);

        assert.nonEmptyString(vidyRootUrl);
        assert(vidyRootUrl.startsWith("https://"));
        assert(vidyRootUrl.endsWith("/"));

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    protected async dataHandler(
        @asrt() data: IOutgoingSearchCommand,
    ): Promise<void> {
        this.logger.trace(data, "dataHandler");

        // NOTE: starts without a forward slash.
        const baseSearchUrl = "3/search";
        const searchUrl = `${this.vidyRootUrl}${baseSearchUrl}`;
        const result = await this.authenticatedRequest.post<IIncomingSearchResultEvent>(searchUrl, data);

        const event: IIncomingSearchResultEvent = {
            clips: result.clips,
            search: result.search,
            tags: result.tags,
        };

        this.incomingSearchResultEventEmitter.emit(event);
    }

    @asrt(1)
    protected async filter(
        @asrt() data: IOutgoingSearchCommand,
    ): Promise<boolean> {
        return true;
    }
}
