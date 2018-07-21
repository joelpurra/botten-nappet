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

import IEventEmitter from "@botten-nappet/shared/src/event/ievent-emitter";

import IIncomingSearchResultEvent from "@botten-nappet/interface-shared-vidy/src/event/iincoming-search-result-event";
import EventSubscriptionManager from "@botten-nappet/shared/src/event/event-subscription-manager";
import IEventSubscriptionConnection from "@botten-nappet/shared/src/event/ievent-subscription-connection";

import IOutgoingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-irc-command";

@asrt(5)
export default class VidyResultEventHandler extends EventSubscriptionManager<IIncomingSearchResultEvent> {
    constructor(
        @asrt() logger: PinoLogger,
        @asrt() connection: IEventSubscriptionConnection<IIncomingSearchResultEvent>,
        @asrt() private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
        @asrt() private readonly channelName: string,
        @asrt() private readonly vidyVideoLinkBaseUrl: string,
    ) {
        super(logger, connection);

        assert.nonEmptyString(channelName);
        assert(channelName.startsWith("#"));
        assert.nonEmptyString(vidyVideoLinkBaseUrl);
        assert(vidyVideoLinkBaseUrl.startsWith("https://"));
        assert(vidyVideoLinkBaseUrl.endsWith("/"));

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(1)
    public async dataHandler(
        @asrt() data: IIncomingSearchResultEvent,
    ): Promise<void> {
        this.logger.trace(data, "dataHandler");

        this.logger.warn(data, "functionality disabled", "dataHandler");
        return;

        const clipLinks = data.clips.results.map((result) => `${this.vidyVideoLinkBaseUrl}${result.id}`);

        // TODO: response template.
        /* tslint:disable max-line-length */
        const response = `Got ${data.clips.results.length} results for ${data.search.q}: ${clipLinks.join(" ")}`;
        /* tslint:enable max-line-length */

        // TODO: merge with IOutgoingSearchCommand to get channel context, triggerer username,
        // search query-response validity checks.// TODO: merge with IOutgoingSearchCommand to
        // get channel context, triggerer username, search query-response validity checks.
        const command: IOutgoingIrcCommand = {
            channel: this.channelName,
            command: "PRIVMSG",
            message: response,
            tags: {},
            // TODO: use timestamp from the search result data?
            timestamp: new Date(),
        };

        this.outgoingIrcCommandEventEmitter.emit(command);
    }

    @asrt(1)
    public async filter(
        // @asrt() data: IIncomingSearchResultEvent,
    ): Promise<boolean> {
        // TODO: merge with IOutgoingSearchCommand to get channel context, triggerer
        // username, search query-response validity checks.
        return true;
    }
}
