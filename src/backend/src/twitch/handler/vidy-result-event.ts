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

import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";

import IIncomingSearchResultEvent from "@botten-nappet/interface-vidy/command/iincoming-search-result-event";
import EventSubscriptionManager from "@botten-nappet/shared/event/event-subscription-manager";
import IEventSubscriptionConnection from "@botten-nappet/shared/event/ievent-subscription-connection";

import IOutgoingIrcCommand from "@botten-nappet/backend-twitch/irc/interface/ioutgoing-irc-command";

export default class VidyResultEventHandler extends EventSubscriptionManager<IIncomingSearchResultEvent> {
    public vidyVideoLinkBaseUrl: string;
    private channelName: string;
    private outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>;

    constructor(
        logger: PinoLogger,
        connection: IEventSubscriptionConnection<IIncomingSearchResultEvent>,
        outgoingIrcCommandEventEmitter: IEventEmitter<IOutgoingIrcCommand>,
        channelName: string,
        vidyVideoLinkBaseUrl: string,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof outgoingIrcCommandEventEmitter, "object");
        assert.nonEmptyString(channelName);
        assert(channelName.startsWith("#"));
        assert.nonEmptyString(vidyVideoLinkBaseUrl);
        assert(vidyVideoLinkBaseUrl.startsWith("https://"));
        assert(vidyVideoLinkBaseUrl.endsWith("/"));

        this.logger = logger.child("TextResponseCommandIrcHandler");
        this.outgoingIrcCommandEventEmitter = outgoingIrcCommandEventEmitter;
        this.channelName = channelName;
        this.vidyVideoLinkBaseUrl = vidyVideoLinkBaseUrl;
    }

    public async dataHandler(data: IIncomingSearchResultEvent): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

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

    public async filter(data: IIncomingSearchResultEvent): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        // TODO: merge with IOutgoingSearchCommand to get channel context, triggerer
        // username, search query-response validity checks.
        return true;
    }
}
