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

import moment from "moment";

import PinoLogger from "@botten-nappet/shared/util/pino-logger";

import IEventEmitter from "@botten-nappet/shared/event/ievent-emitter";

/* tslint:disable:max-line-length */

import IPollingFollowingResponse from "@botten-nappet/backend-twitch/interface/response/polling/ifollowing-polling-response";
import ITwitchApiV5ChannelFollowingEvent from "@botten-nappet/backend-twitch/interface/response/polling/itwitch-api-v5-channel-following-event";
import IIncomingFollowingEvent from "@botten-nappet/interface-twitch/event/iincoming-following-event";

/* tslint:enable:max-line-length */

import IPollingConnection from "../polling/connection/ipolling-connection";
import PollingManager from "../polling/connection/polling-manager";

export default class IncomingFollowingCommandEventTranslator extends PollingManager<IPollingFollowingResponse> {
    public userid: number;
    public username: string;
    private lastFollowingMessageTimestamp: number;
    private incomingFollowingEventEmitter: IEventEmitter<IIncomingFollowingEvent>;

    constructor(
        logger: PinoLogger,
        connection: IPollingConnection<IPollingFollowingResponse>,
        incomingFollowingEventEmitter: IEventEmitter<IIncomingFollowingEvent>,
        username: string,
        userid: number,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingFollowingEventEmitter, "object");
        assert.nonEmptyString(username);
        assert.integer(userid);
        assert.positive(userid);

        this.logger = logger.child("IncomingFollowingCommandEventTranslator");
        this.incomingFollowingEventEmitter = incomingFollowingEventEmitter;
        this.username = username;
        this.userid = userid;

        this.lastFollowingMessageTimestamp = Date.now();
    }

    protected async dataHandler(data: IPollingFollowingResponse): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const newFollows = await this.getNewFollows(data.follows, this.lastFollowingMessageTimestamp);

        this.lastFollowingMessageTimestamp = Date.now();

        newFollows.forEach((follow) => {
            const userId = parseInt(follow.user._id, 10);

            const timestamp = moment(follow.created_at).toDate();

            const event: IIncomingFollowingEvent = {
                channel: {
                    id: this.userid,
                    name: this.username,
                },
                timestamp,
                triggerer: {
                    id: userId,
                    name: follow.user.name,
                },
            };

            this.incomingFollowingEventEmitter.emit(event);
        });
    }

    protected async filter(data: IPollingFollowingResponse): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (typeof data !== "object") {
            return false;
        }

        if (!Array.isArray(data.follows)) {
            return false;
        }

        const newFollows = await this.getNewFollows(data.follows, this.lastFollowingMessageTimestamp);

        const shouldHandle = newFollows.length > 0;

        return shouldHandle;
    }

    private async getNewFollows(
        follows: ITwitchApiV5ChannelFollowingEvent[],
        since: number,
    ): Promise<ITwitchApiV5ChannelFollowingEvent[]> {
        const newFollows = follows.filter((follow) => {
            const followedAt = Date.parse(follow.created_at);

            const isNewFollow = (followedAt > since);

            return isNewFollow;
        });

        return newFollows;
    }
}
