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

import Rx from "rxjs";

import io from "socket.io-client";

import ConsoleLog from "./console-log";

export default class BotSocket {
    public url: string;
    private socket: SocketIOClient.Socket | null;
    private sharedSocketObservable: Rx.Observable<any> | null;
    private socketObservable: Rx.Observable<any> | null;
    private logger: ConsoleLog;

    constructor(
        logger: ConsoleLog,
        url: string,
    ) {
        this.logger = logger;
        this.url = url;

        this.socket = null;
        this.sharedSocketObservable = null;
        this.socketObservable = null;
    }

    public async connect(): Promise<void> {
        // TODO: disconnect.
        this.socket = io(this.url);

        this.socketObservable = Rx.Observable.fromEvent<any>(this.socket, "message");
        this.sharedSocketObservable = this.socketObservable.share();

        this.socket.on("connect", () => {
            this.logger.log("connect");
        });

        this.socket.on("message", (data: any) => {
            this.logger.log("message", data);
        });

        this.socket.on("disconnect", () => {
            this.logger.log("disconnect");
        });
    }

    public get dataObservable(): Rx.Observable<any> {
        // assert.hasLength(arguments, 0);
        // assert.not.null(this.sharedSocketObservable);

        // TODO: better null handling.
        return this.sharedSocketObservable!;
    }
}
