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
import Rx, {
    Observer,
    Subject,
    Subscription,
} from "rxjs";

import zmq from "zeromq-ng";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";
import IEventSubscriptionConnection from "../event/ievent-subscription-connection";
import IZeroMqTopicMessages from "./izeromq-topic-message";
import {
    ZeroMqMessages,
} from "./zeromq-types";

export default abstract class TopicsSubscriber<T> implements IEventSubscriptionConnection<T> {
    protected logger: PinoLogger;
    protected topics: string[];
    private socket: any | null;
    private zmqSubject: Subject<IZeroMqTopicMessages> | null;
    private sharedzmqObservable: Rx.Observable<T> | null;
    private zmqSubcription: Subscription | null;

    constructor(
        logger: PinoLogger,
        private readonly address: string,
        ...topics: string[],
    ) {
        // NOTE: variable arguments length.
        assert.equal(typeof logger, "object");
        assert.equal(typeof address, "string");
        assert(address.length > 0);
        assert(address.startsWith("tcp://"));
        assert.array(topics);

        // TODO: configurable.
        const topicsStringSeparator = ":";

        this.topics = topics;
        this.logger = logger.child(`${this.constructor.name} (${this.topics.join(topicsStringSeparator)})`);

        this.zmqSubject = null;
        this.sharedzmqObservable = null;
        this.zmqSubcription = null;
        this.socket = null;
    }

    public async connect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.equal(this.socket, null);
        assert.null(this.zmqSubject);
        assert.null(this.zmqSubcription);

        const zmqSubcriberOptions = {
            linger: 0,
        };

        this.socket = new zmq.Subscriber(zmqSubcriberOptions);
        await this.socket.connect(this.address);
        await this.socket.subscribe(...this.topics);

        const openedObserver: Observer<T> = {
            complete: () => {
                this.logger.trace("complete", "openedObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this.logger.error(error, "error", "openedObserver");
            },
            next: (message) => {
                // this.logger.trace(message, "next", "openedObserver");
            },
        };

        this.zmqSubject = new Subject<IZeroMqTopicMessages>();

        this.zmqSubject.asObservable()
            .do((val) => this.logger.trace(val, "zmqSubject"));

        this.sharedzmqObservable = this.zmqSubject.share()
            .concatFilter((data: IZeroMqTopicMessages) => Rx.Observable.from(this.filterMessages(data)))
            .concatMap((message: IZeroMqTopicMessages) => Rx.Observable.from(this.parseMessages(message)));

        this.zmqSubcription = this.sharedzmqObservable!
            .subscribe(openedObserver);

        // NOTE: listening outside of the async/await (promise) chain.
        this.listen();

        this.logger.debug("connected");
    }

    public async disconnect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.equal(this.socket, null);
        assert.not.null(this.zmqSubject);
        assert.not.null(this.zmqSubcription);

        await this.socket.unsubscribe(...this.topics);

        this.zmqSubcription!.unsubscribe();
        this.zmqSubject!.complete();

        await this.socket.disconnect(this.address);
        await this.socket.close();
        this.socket = null;

        this.logger.debug("disconnected");
    }

    public async reconnect(): Promise<void> {
        assert.hasLength(arguments, 0);

        await this.disconnect();
        await this.connect();
    }

    public get dataObservable(): Rx.Observable<T> {
        assert.hasLength(arguments, 0);
        assert.not.null(this.sharedzmqObservable);

        // TODO: better null handling.
        return this.sharedzmqObservable!;
    }

    protected abstract async filterMessages(topicMessages: IZeroMqTopicMessages): Promise<boolean>;
    protected abstract async parseMessages(topicMessages: IZeroMqTopicMessages): Promise<T>;

    private async listen(): Promise<void> {
        assert.not.null(this.socket);
        assert.not.null(this.zmqSubject);

        while (this.socket && !this.socket.closed) {
            try {
                const msgs: ZeroMqMessages = await this.socket.receive();

                const data: IZeroMqTopicMessages = {
                    messages: msgs.slice(1),
                    topic: msgs[0].toString(),
                };

                // TODO: better null handling.
                this.zmqSubject!.next(data);
            } catch (error) {
                if (error.code === "EAGAIN") {
                    // NOTE: ignoring errors when the socket closes.
                    continue;
                }

                throw error;
            }
        }

        if (this.socket) {
            // TODO: reconnect if the socket should stay open?
            await this.disconnect();
        }
    }
}
