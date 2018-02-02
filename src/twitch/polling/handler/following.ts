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
import PollingManager from "../polling-manager";

type TwitchApiV5ChannelFollower = any;
type TwitchApiV5ChannelFollowers = TwitchApiV5ChannelFollower[];

export default class FollowingPollingHandler extends PollingManager {
    public _lastFollowingMessageTimestamp: number;
    public _ircChannel: string;
    public _ircConnection: IIRCConnection;
    constructor(logger: PinoLogger, connection: IConnection, ircConnection: IIRCConnection, ircChannel: string) {
        super(logger, connection);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof ircConnection, "object");
        assert.equal(typeof ircChannel, "string");
        assert(ircChannel.startsWith("#"));
        assert.greater(ircChannel.length, 1);

        this._ircConnection = ircConnection;
        this._ircChannel = ircChannel;

        this._logger = logger.child("FollowingPollingHandler");
        this._lastFollowingMessageTimestamp = Date.now();
    }

    public async _dataHandler(data: any): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        const newFollows = await this._getNewFollows(data.follows, this._lastFollowingMessageTimestamp);

        this._lastFollowingMessageTimestamp = Date.now();

        newFollows.forEach((follow) => {
            this._logger.trace("Responding to follower.", follow.user.name, "_dataHandler");

            // TODO: use a string templating system.
            // TODO: configure message.
            const message =
                `PRIVMSG ${this._ircChannel} :Hey @${follow.user.name}, thanks for following! Hope to see you next live stream 😀`;

            this._ircConnection.send(message);
        });
    }

    public async _filter(data: any): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (typeof data !== "object") {
            return false;
        }

        if (!Array.isArray(data.follows)) {
            return false;
        }

        const newFollows = await this._getNewFollows(data.follows, this._lastFollowingMessageTimestamp);

        const shouldHandle = newFollows.length > 0;

        return shouldHandle;
    }

    public async _getNewFollows(follows: TwitchApiV5ChannelFollowers, since: number) {
        const newFollows = follows.filter((follow) => {
            const followedAt = Date.parse(follow.created_at);

            const isNewFollow = (followedAt > since);

            return isNewFollow;
        });

        return newFollows;
    }
}
