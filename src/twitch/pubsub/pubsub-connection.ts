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

import PinoLogger from "../../util/pino-logger";
import {
    UserAccessTokenProviderType,
} from "../authentication/provider-types";
import IWebSocketCommand from "../websocket/iwebsocket-command";
import WebSocketConnection from "../websocket/websocket-connection";
import IPubSubConnection from "./ipubsub-connection";
import IPubSubResponse from "./ipubsub-response";

export default class PubSubConnection extends WebSocketConnection<IPubSubResponse, any> implements IPubSubConnection {
    private userAccessTokenProvider: UserAccessTokenProviderType;
    private topics: string[];

    constructor(
        logger: PinoLogger,
        uri: string,
        topics: string[],
        userAccessTokenProvider: UserAccessTokenProviderType,
    ) {
        super(logger, uri);

        assert.hasLength(arguments, 4);
        assert.equal(typeof logger, "object");
        assert.equal(typeof uri, "string");
        assert.nonEmptyString(uri);
        assert(uri.startsWith("wss://"));
        assert.array(topics);
        assert.nonEmptyArray(topics);
        assert.equal(typeof userAccessTokenProvider, "function");

        this.logger = logger.child("PubSubConnection");

        this.topics = topics;
        this.userAccessTokenProvider = userAccessTokenProvider;
    }

    protected async getSetupConnectionCommands(): Promise<Array<IWebSocketCommand<IPubSubResponse>>> {
        const userAccessToken = await this.userAccessTokenProvider();

        const listenNonce = Math.random()
            .toString(10);

        const setupConnectionCommands: Array<IWebSocketCommand<IPubSubResponse>> = [
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
                            topics: this.topics,
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

    protected async parseMessage(rawMessage: string): Promise<any> {
        // TODO: verify response format.
        // TODO: try-catch for bad messages.
        const data = JSON.parse(rawMessage.toString());

        return data;
    }
}
