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

// NOTE: parts of the parseMessage function comes from official Twitch example code; see license note.
// https://github.com/twitchdev/chat-samples/blob/master/javascript/chatbot.js

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

import IrcConfig from "../../config/irc-config";

import UserAccessTokenProvider from "../../authentication/user-access-token-provider";
import UserChannelNameProvider from "../../authentication/user-channel-provider";
import UserNameProvider from "../../authentication/user-name-provider";

import IWebSocketCommand from "@botten-nappet/interface-backend-twitch/src/event/iwebsocket-command";

import IIncomingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/iincoming-irc-command";
import IOutgoingIrcCommand from "@botten-nappet/interface-backend-twitch/src/event/ioutgoing-irc-command";

import WebSocketConnection from "../../websocket/connection/websocket-connection";
import IIRCConnection from "./iirc-connection";

@asrt(5)
@autoinject
export default class IrcConnection
    extends WebSocketConnection<IIncomingIrcCommand, IOutgoingIrcCommand>
    implements IIRCConnection {

    constructor(
        @asrt() ircConfig: IrcConfig,
        @asrt() logger: PinoLogger,
        @asrt() private readonly userChannelNameProvider: UserChannelNameProvider,
        @asrt() private readonly userNameProvider: UserNameProvider,
        @asrt() private readonly userAccessTokenProvider: UserAccessTokenProvider,
    ) {
        super(logger, ircConfig.twitchIrcWebSocketUri, "irc");

        this.logger = logger.child(this.constructor.name);
    }

    public get channel(): Promise<string> {
        return this.userChannelNameProvider.get();
    }

    @asrt(0)
    protected async getSetupConnectionCommands(): Promise<Array<
        IWebSocketCommand<IIncomingIrcCommand, IOutgoingIrcCommand>
        >> {
        const userAccessToken = await this.userAccessTokenProvider.get();
        const userChannelName = await this.userChannelNameProvider.get();
        const userName = await this.userNameProvider.get();

        // TODO: make capabilities configurable/subclassable?
        const capabilities = [
            "twitch.tv/tags",
            "twitch.tv/commands",
            "twitch.tv/membership",
        ];

        const capabilitiesString = capabilities.join(" ");

        const setupConnectionCommands: Array<
            IWebSocketCommand<IIncomingIrcCommand, IOutgoingIrcCommand>
            > = [
                {
                    commands: [
                        {
                            channel: null,
                            command: "CAP REQ",
                            message: `:${capabilitiesString}`,
                            tags: {},
                            timestamp: new Date(),
                        },
                    ],
                    verifier: (message) => message.original.includes("CAP * ACK"),
                },

                {
                    commands: [
                        {
                            channel: null,
                            command: "PASS",
                            // NOTE: the user access token needs to have an "oauth:" prefix.
                            message: `oauth:${userAccessToken}`,
                            tags: {},
                            timestamp: new Date(),
                        },
                        {
                            channel: null,
                            command: "NICK",
                            message: userName,
                            tags: {},
                            timestamp: new Date(),
                        },
                    ],
                    // NOTE: the "001" message might change, but for now it's a hardcoded return value.
                    // https://dev.twitch.tv/docs/irc#connecting-to-twitch-irc
                    verifier: (message) => message.original.includes("001"),
                },

                {
                    commands: [
                        {
                            channel: null,
                            command: "JOIN",
                            message: userChannelName,
                            tags: {},
                            timestamp: new Date(),
                        },
                    ],
                    verifier: (message) => message.original.includes(`JOIN ${userChannelName}`),
                },
            ];

        return setupConnectionCommands;
    }

    @asrt(1)
    protected async parseMessage(
        @asrt() rawMessage: string,
    ): Promise<IIncomingIrcCommand> {
        // NOTE: parts of the parseMessage function comes from official Twitch example code; see license note.
        // https://github.com/twitchdev/chat-samples/blob/master/javascript/chatbot.js

        /* tslint:disable:max-line-length */
        /*
        Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
        Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
            http://aws.amazon.com/apache2.0/
        or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

            This file is what connects to chat and parses messages as they come along. The chat client connects via a
            Web Socket to Twitch chat. The important part events are onopen and onmessage.
        */

        // This is an example of an IRC message with tags. I split it across
        // multiple lines for readability.

        // @badges=global_mod/1,turbo/1;color=#0D4200;display-name=TWITCH_UserNaME;emotes=25:0-4,12-16/1902:6-10;mod=0;room-id=1337;subscriber=0;turbo=1;user-id=1337;user-type=global_mod
        // :twitch_username!twitch_username@twitch_username.tmi.twitch.tv
        // PRIVMSG
        // #channel
        // :Kappa Keepo Kappa
        /* tslint:enable:max-line-length */

        const incomingMessage: IIncomingIrcCommand = {
            channel: null,
            command: null,
            message: null,
            original: rawMessage,
            originalTags: null,
            tags: null,
            timestamp: new Date(),
            username: null,
        };

        if (rawMessage[0] === "@") {
            const tagIndex = rawMessage.indexOf(" ");
            const userIndex = rawMessage.indexOf(" ", tagIndex + 1);
            const commandIndex = rawMessage.indexOf(" ", userIndex + 1);
            const channelIndex = rawMessage.indexOf(" ", commandIndex + 1);
            const messageIndex = rawMessage.indexOf(":", channelIndex + 1);

            incomingMessage.originalTags = rawMessage.slice(1, tagIndex);
            incomingMessage.username = rawMessage.slice(tagIndex + 2, rawMessage.indexOf("!"));
            incomingMessage.command = rawMessage.slice(userIndex + 1, commandIndex);
            incomingMessage.channel = rawMessage.slice(commandIndex + 1, channelIndex);
            incomingMessage.message = rawMessage.slice(messageIndex + 1);

            incomingMessage.tags = incomingMessage.originalTags
                .split(";")
                .reduce(
                    (obj: any, tag) => {
                        const parts = tag.split("=");
                        const key = parts[0];
                        const value = parts[1];

                        // NOTE: handle the case of having repeated tag keys.
                        // NOTE: this means a parsed tag value can be either a string or an array of strings.
                        obj[key] = obj[key]
                            ? new Array().concat(obj[key])
                                .concat(value)
                            : value;

                        return obj;
                    },
                    {},
            );
        } else if (rawMessage.startsWith("PING")) {
            incomingMessage.command = "PING";
            incomingMessage.message = rawMessage.split(":")[1];
        }

        return incomingMessage;
    }

    @asrt(1)
    protected async serializeMessage(
        @asrt() data: IOutgoingIrcCommand,
    ): Promise<string> {
        // TODO: serialize data.tags.
        let message = null;

        if (data.channel === null) {
            message = `${data.command} ${data.message}`;
        } else {
            assert(data.channel.startsWith("#"));

            message = `${data.command} ${data.channel} :${data.message}`;
        }

        return message;
    }
}
