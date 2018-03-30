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

import IIncomingSubscriptionEvent from "@botten-nappet/interface-twitch/event//iincoming-subscription-event";

import IIncomingIrcCommand from "../../irc/command/iincoming-irc-command";
import IrcConnection from "../../irc/irc-connection";
import IrcManager from "../../irc/irc-manager";

export default class IncomingSubscriptionCommandEventTranslator extends IrcManager {
    public userid: number;
    public username: string;
    private incomingSubscriptionEventEmitter: IEventEmitter<IIncomingSubscriptionEvent>;

    constructor(
        logger: PinoLogger,
        connection: IrcConnection,
        incomingSubscriptionEventEmitter: IEventEmitter<IIncomingSubscriptionEvent>,
        username: string,
        userid: number,
    ) {
        super(logger, connection);

        assert.hasLength(arguments, 5);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");
        assert.equal(typeof incomingSubscriptionEventEmitter, "object");
        assert.nonEmptyString(username);
        assert.integer(userid);
        assert.positive(userid);

        this.logger = logger.child("IncomingSubscriptionCommandEventTranslator");
        this.incomingSubscriptionEventEmitter = incomingSubscriptionEventEmitter;
        this.username = username;
        this.userid = userid;
    }

    protected async dataHandler(data: IIncomingIrcCommand): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");
        assert.equal(typeof data.tags, "object");

        const tags = data.tags!;
        const username = tags.login;
        // NOTE: contains sub/resub.
        // const msgId = tags["msg-id"];
        const msgParamMonths = parseInt(tags["msg-param-months"], 10);
        const months = !isNaN(msgParamMonths) && msgParamMonths >= 0 ? msgParamMonths : 0;
        const userId = parseInt(data.tags!["user-id"], 10);

        const event: IIncomingSubscriptionEvent = {
            channel: {
                id: this.userid,
                name: this.username,
            },
            message: data.message,
            months,
            timestamp: data.timestamp,
            triggerer: {
                id: userId,
                name: username,
            },
        };

        this.incomingSubscriptionEventEmitter.emit(event);
    }

    protected async filter(data: IIncomingIrcCommand): Promise<boolean> {
        assert.hasLength(arguments, 1);
        assert.equal(typeof data, "object");

        if (data.command !== "USERNOTICE") {
            return false;
        }

        const tags = data.tags;

        if (tags === null) {
            return false;
        }

        if (typeof tags !== "object") {
            return false;
        }

        const msgId = tags["msg-id"];

        if (typeof msgId !== "string") {
            return false;
        }

        if (msgId !== "sub" && msgId !== "resub") {
            return false;
        }

        return true;
    }
}
