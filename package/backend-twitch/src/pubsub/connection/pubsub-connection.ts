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
    autoinject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IWebSocketCommand from "@botten-nappet/interface-backend-twitch/src/event/iwebsocket-command";

import WebSocketConnection from "@botten-nappet/backend-twitch/src/websocket/connection/websocket-connection";

/* tslint:disable max-line-length */

import UserAccessTokenProvider from "@botten-nappet/backend-twitch/src/authentication/user-access-token-provider";
import PubSubConfig from "@botten-nappet/backend-twitch/src/config/pubsub-config";
import UserPubSubTopicsProvider from "@botten-nappet/backend-twitch/src/pubsub/connection/user-pubsub-topics-provider";
import IPubSubResponse from "@botten-nappet/interface-backend-twitch/src/event/ipubsub-response";
import IPubSubConnection from "@botten-nappet/backend-twitch/src/pubsub/connection/ipubsub-connection";

/* tslint:enable max-line-length */

@asrt(4)
@autoinject
export default class PubSubConnection extends WebSocketConnection<IPubSubResponse, any> implements IPubSubConnection {
    constructor(
        @asrt() pubSubConfig: PubSubConfig,
        @asrt() logger: PinoLogger,
        @asrt() private readonly userPubSubTopicsProvider: UserPubSubTopicsProvider,
        @asrt() private readonly userAccessTokenProvider: UserAccessTokenProvider,
    ) {
        super(logger, pubSubConfig.twitchPubSubWebSocketUri);

        assert.equal(typeof pubSubConfig.twitchPubSubWebSocketUri, "string");
        assert.nonEmptyString(pubSubConfig.twitchPubSubWebSocketUri);
        assert(pubSubConfig.twitchPubSubWebSocketUri.startsWith("wss://"));

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    protected async getSetupConnectionCommands(): Promise<Array<IWebSocketCommand<IPubSubResponse, any>>> {
        const userAccessToken = await this.userAccessTokenProvider.get();

        const listenNonce = Math.random()
            .toString(10);

        const topics = await this.userPubSubTopicsProvider.get();

        const setupConnectionCommands: Array<IWebSocketCommand<IPubSubResponse, any>> = [
            {
                commands: [
                    // TODO: typing for the PING request.
                    {
                        type: "PING",
                    },
                ],
                verifier: (data) => {
                    // TODO: typing for the PING/PONG response.
                    if (data.type === "PONG") {
                        return true;
                    }

                    return false;
                },
            },

            {
                commands: [
                    {
                        // TODO: typing for the LISTEN request.
                        data: {
                            auth_token: userAccessToken,
                            topics,
                        },
                        nonce: listenNonce,
                        type: "LISTEN",
                    },
                ],
                verifier: (data) => {
                    // TODO: typing for the LISTEN response.
                    if (data.nonce !== listenNonce) {
                        // NOTE: skip non-matching messages; they are presumably for other handlers.
                        return false;
                    }

                    // TODO: use as part of generic error checking for twitch pubsub-connections?
                    if (typeof data.error === "string" && data.error.length !== 0) {
                        const listenError = new Error(`Listen error: ${JSON.stringify(data.error)}`);

                        this.logger.error(listenError, data, "Listen error");

                        throw listenError;
                    }

                    // TODO: use as part of generic error checking for twitch pubsub-connections?
                    if (data.type !== "RESPONSE") {
                        const badTypeError = new Error(`Bad type: ${JSON.stringify(data.type)}`);

                        this.logger.error(badTypeError, data, "Bad type");

                        throw badTypeError;
                    }

                    return true;
                },
            },
        ];

        return setupConnectionCommands;
    }

    @asrt(1)
    protected async parseMessage(
        @asrt() rawMessage: string,
    ): Promise<IPubSubResponse> {
        // TODO: verify response format.
        // TODO: try-catch for bad messages.
        const data = JSON.parse(rawMessage.toString());

        if (data.timestamp) {
            // TODO: parse.
            /* tslint:disable max-line-length */
            this.logger.warn(`Message contained timestamp (${typeof data.timestamp}, ${data.timestamp}), it should be parsed.`);
            /* tslint:enable max-line-length */
        }

        if (!data.timestamp) {
            // TODO: use timestamp from upstream?
            data.timestamp = new Date();
        }

        if (typeof data.data === "object" && typeof data.data.message === "string") {
            const innerMessageParsed = JSON.parse(data.data.message);
            data.data.messageParsed = innerMessageParsed;
        }

        return data;
    }

    @asrt(1)
    protected async serializeMessage(data: any): Promise<string> {
        let message = null;

        if (typeof data === "string") {
            message = data;
        } else {
            message = JSON.stringify(data);
        }

        return message;
    }
}
