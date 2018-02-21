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

import PinoLogger from "../../../util/pino-logger";
import IConnection from "../../iconnection";
import IIRCConnection from "../../irc/iirc-connection";
import IPollingConnection from "../ipolling-connection";
import PollingManager from "../polling-manager";

type TwitchApiV5ChannelFollower = any;
type TwitchApiV5ChannelFollowers = TwitchApiV5ChannelFollower[];

export default class FollowingPollingHandler extends PollingManager<any, void> {
    private lastFollowingMessageTimestamp: number;
    private ircChannel: string;
    private ircConnection: IIRCConnection;

    constructor(
        logger: PinoLogger,
        connection: IPollingConnection<any, void>,
        ircConnection: IIRCConnection,
        ircChannel: string,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof ircConnection, "object");
        assert.equal(typeof ircChannel, "string");
        assert(ircChannel.startsWith("#"));
        assert.greater(ircChannel.length, 1);

        this.ircConnection = ircConnection;
        this.ircChannel = ircChannel;

        this.logger = logger.child("FollowingPollingHandler");
        this.lastFollowingMessageTimestamp = Date.now();
    }

    protected async dataHandler(data: any): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const newFollows = await this.getNewFollows(data.follows, this.lastFollowingMessageTimestamp);

        this.lastFollowingMessageTimestamp = Date.now();

        newFollows.forEach((follow) => {
            this.logger.trace("Responding to follower.", follow.user.name, "dataHandler");

            // TODO: use a string templating system.
            // TODO: configure message.
            /* tslint:disable:max-line-length */
            const message = `PRIVMSG ${this.ircChannel} :Hey @${follow.user.name}, thanks for following! Hope to see you next live stream 😀`;
            /* tslint:enable:max-line-length */

            this.ircConnection.send(message);
        });
    }

    protected async filter(data: any): Promise<boolean> {
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
        follows: TwitchApiV5ChannelFollowers,
        since: number,
    ): Promise<TwitchApiV5ChannelFollowers> {
        const newFollows = follows.filter((follow) => {
            const followedAt = Date.parse(follow.created_at);

            const isNewFollow = (followedAt > since);

            return isNewFollow;
        });

        return newFollows;
    }
}
