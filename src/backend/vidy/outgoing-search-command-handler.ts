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

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import EventSubscriptionManager from "@botten-nappet/shared/event/event-subscription-manager";
import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";
import IEventSubscriptionConnection from "@botten-nappet/shared/event/ievent-subscription-connection";

import IIncomingSearchResultEvent from "@botten-nappet/interface-vidy/command/iincoming-search-result-event";
import IOutgoingSearchCommand from "@botten-nappet/interface-vidy/command/ioutgoing-search-command";

import AuthenticatedRequest from "./request/authenticated-request";

export default class OutgoingSearchCommandHandler extends EventSubscriptionManager<IOutgoingSearchCommand> {
    private vidyRootUrl: string;
    private authenticatedRequest: AuthenticatedRequest;
    private incomingSearchResultEventEmitter: IEventEmitter<IIncomingSearchResultEvent>;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IOutgoingSearchCommand>,
        incomingSearchResultEventEmitter: IEventEmitter<IIncomingSearchResultEvent>,
        authenticatedRequest: AuthenticatedRequest,
        vidyRootUrl: string,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingSearchResultEventEmitter, "object");
        assert.equal(typeof authenticatedRequest, "object");
        assert.nonEmptyString(vidyRootUrl);
        assert(vidyRootUrl.startsWith("https://"));
        assert(vidyRootUrl.endsWith("/"));

        this.logger = logger.child("IncomingSearchEventTranslator");
        this.incomingSearchResultEventEmitter = incomingSearchResultEventEmitter;
        this.authenticatedRequest = authenticatedRequest;
        this.vidyRootUrl = vidyRootUrl;
    }

    protected async dataHandler(data: IOutgoingSearchCommand): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

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

    protected async filter(data: IOutgoingSearchCommand): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        return true;
    }
}
