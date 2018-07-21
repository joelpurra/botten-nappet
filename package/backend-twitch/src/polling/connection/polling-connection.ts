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
import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import Rx, {
    from,
    interval,
    Observable,
    Observer,
    Subject,
    Subscription,
} from "rxjs";
import {
    concatMap,
    share,
} from "rxjs/operators";

// import {
//     rxios as Rxios,
// } from "rxios";
import {
    rxios as Rxios,
} from "@botten-nappet/backend-shared/lib/rxios";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import RequestHelper from "@botten-nappet/backend-twitch/src/helper/request-helper";
import IPollingConnection from "@botten-nappet/backend-twitch/src/polling/connection/ipolling-connection";
import IHttpData from "@botten-nappet/interface-backend-twitch/src/event/ihttp-data";
import IHttpHeaders from "@botten-nappet/interface-backend-twitch/src/event/ihttp-header";

type DataHandler = (data: any) => void;
type DataFilter = (data: any) => boolean;
interface IDataHandlerObject {
    handler: DataHandler;
    filter: DataFilter;
}

@asrt()
export default abstract class PollingConnection<T> implements IPollingConnection<T> {
    protected logger: PinoLogger;
    private intervalSubscription: Rx.Subscription | null;
    private pollingSubject: Subject<T> | null;
    private sharedpollingObservable: Rx.Observable<T> | null;
    private pollingSubcription: Subscription | null;
    private dataHandlerObjects: IDataHandlerObject[];
    private intervalMinimumMilliseconds: number;
    private readonly methods: string[] = [
        "get",
        "delete",
        "head",
        "options",
        "post",
        "put",
        "patch",
    ];

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly intervalInMilliseconds: number,
        @asrt() private readonly atBegin: boolean,
        @asrt() private readonly method: string,
        private dataSerializer?: RequestHelper,
        private defaultHeaders?: IHttpHeaders,
        private defaultData?: IHttpData,
    ) {
        assert(arguments.length === 4 || arguments.length === 5 || arguments.length === 6 || arguments.length === 7);
        assert.equal(typeof logger, "object");
        assert.number(intervalInMilliseconds);
        assert.greater(intervalInMilliseconds, 0);
        assert.equal(typeof atBegin, "boolean");
        assert.equal(typeof method, "string");
        assert.greater(method.length, 0);
        assert(typeof defaultHeaders === "undefined" || typeof defaultHeaders === "object");
        assert(typeof defaultData === "undefined" || typeof defaultData === "object");

        this.logger = logger.child(this.constructor.name);

        assert(this.methods.includes(this.method));

        this.intervalMinimumMilliseconds = 10 * 1000;

        assert(this.intervalInMilliseconds >= this.intervalMinimumMilliseconds);

        this.intervalSubscription = null;
        this.pollingSubject = null;
        this.sharedpollingObservable = null;
        this.pollingSubcription = null;
        this.dataHandlerObjects = [];
    }

    public get dataObservable(): Rx.Observable<T> {
        assert.not.null(this.sharedpollingObservable);

        // TODO: better null handling.
        return this.sharedpollingObservable!;
    }

    @asrt(0)
    public async reconnect(): Promise<void> {
        await this.disconnect();
        await this.connect();
    }

    @asrt(0)
    public async isConnected(): Promise<boolean> {
        // TODO: implement a real check.
        return true;
    }

    @asrt(0)
    public async connect(): Promise<void> {
        assert.null(this.pollingSubject);
        assert.null(this.pollingSubcription);

        const openedObserver: Observer<T> = {
            complete: () => {
                this.logger.trace("complete", "openedObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this.logger.error(error, "error", "openedObserver");
            },
            next: (
                // message
            ) => {
                // this.logger.trace(message, "next", "openedObserver");
            },
        };

        this.pollingSubject = new Subject();

        this.pollingSubject.asObservable();

        this.sharedpollingObservable = this.pollingSubject
            .pipe(
                // tap((val) => this.logger.trace(val, "pollingSubject")),
                share(),
                // tap((val) => this.logger.trace(val, "Before merge", "sharedpollingObservable")),
                concatMap((message) => from(this.parseMessage(message))),
        );

        this.pollingSubcription = this.sharedpollingObservable
            .subscribe(openedObserver);

        const intervalObservable = interval(this.intervalInMilliseconds);

        const intervalObserver: Observer<number> = {
            complete: () => {
                this.logger.trace("complete", "intervalObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this.logger.error(error, "error", "intervalObserver");
            },
            next: (counter) => {
                this.logger.trace(counter, "next", "intervalObserver");

                this.sendInternal();
            },
        };

        this.intervalSubscription = intervalObservable.subscribe(intervalObserver);

        if (this.atBegin === true) {
            this.logger.warn(this.atBegin, "atBegin", "connect");
            await this.sendInternal();
        }
    }

    @asrt(0)
    public async disconnect(): Promise<void> {
        assert.not.null(this.intervalSubscription);
        assert.not.null(this.pollingSubject);
        assert.not.null(this.pollingSubcription);

        if (!(this.intervalSubscription instanceof Rx.Subscription)) {
            throw new TypeError("this.intervalSubscription must be Rx.Subscription");
        }

        if (!(this.pollingSubject instanceof Subject)) {
            throw new TypeError("this.pollingSubject must be Subject");
        }

        if (!(this.pollingSubcription instanceof Subscription)) {
            throw new TypeError("this.pollingSubcription must be Subscription");
        }

        // TODO: verify that the refcount reaches 0 for a proper polling "close".
        // TODO: force polling termination after a "close" timeout.
        this.intervalSubscription.unsubscribe();
        this.pollingSubcription.unsubscribe();
        this.pollingSubject.complete();

        this.intervalSubscription = null;
        this.pollingSubject = null;
        this.pollingSubcription = null;
    }

    public async send(): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.undefined(arguments[0]);

        this.logger.trace("send");

        // TODO: better null handling.
        await this.sendInternal();

        // if (resetInterval === true) {
        //     // TODO: unsubscribe/subscribe interval.
        //     // TODO: re-enable.
        //     this.logger.warn(resetInterval, "send");
        // }
    }

    protected abstract async getUri(): Promise<string>;

    protected abstract async getHeaders(): Promise<IHttpHeaders>;

    protected abstract async getData(): Promise<IHttpData>;

    @asrt(1)
    protected async dataHandler(
        @asrt() data: any,
    ): Promise<void> {
        const applicableHandlers = await Bluebird.filter(
            this.dataHandlerObjects,
            (dataHandler) => Promise.resolve(dataHandler.filter(data))
                .then((shouldHandle) => {
                    if (shouldHandle !== true) {
                        return false;
                    }

                    return true;
                })
                .catch((error) => {
                    this.logger.warn(error, `Masking error in dataHandler ${dataHandler.filter.name}`);

                    return false;
                }),
        );

        await Bluebird.each(
            applicableHandlers,
            (dataHandler) => Promise.resolve(dataHandler.handler(data))
                .catch((error) => {
                    this.logger.warn(error, `Masking error in dataHandler ${dataHandler.handler.name}`);

                    return undefined;
                }),
        );
    }

    @asrt(1)
    protected async parseMessage(
        @asrt() rawMessage: any,
    ): Promise<T> {
        // TODO: parse outside this function?
        // TODO: try-catch for bad messages.
        const data: T = rawMessage as T;

        return data;
    }

    @asrt(0)
    private async getAllHeaders(): Promise<IHttpHeaders> {
        const overriddenHeaders = await this.getHeaders();

        const headers = {
            ...this.defaultHeaders,
            ...overriddenHeaders,
        };

        return headers;
    }

    @asrt(0)
    private async getAllData(): Promise<IHttpData | string> {
        const overriddenData = await this.getData();

        const data = {
            ...this.defaultData,
            ...overriddenData,
        };

        if (this.dataSerializer) {
            // TODO: fix return type.
            const serializedData = this.dataSerializer.serialize(data);

            return serializedData;
        }

        return data;
    }

    @asrt(0)
    private async sendInternal(): Promise<void> {
        assert.not.null(this.pollingSubject);

        const [
            uri,
            headers,
            data,
        ] = await Promise.all([
            this.getUri(),
            this.getAllHeaders(),
            this.getAllData(),
        ]);

        assert.equal(typeof uri, "string");
        assert.greater(uri.length, 0);
        assert(uri.startsWith("https://"));

        const axiosInstanceConfig = {
            // TODO: don't pass URL both here and in rxios instance method call.
            baseURL: uri,
            // TODO: don't pass data both here and in rxios instance method call.
            data,
            headers,
            // TODO: don't pass method both here and in rxios instance method call.
            method: this.method,
        };

        // TODO: instantiate only once.
        const rxios = new Rxios(axiosInstanceConfig);

        let request: (Observable<any> | null) = null;

        // TODO: log sending data through the polling.
        switch (this.method) {
            case "get":
                request = rxios.get<any>(uri);
                break;

            case "delete":
                request = rxios.delete(uri);
                break;

            case "head":
                // TODO: patch rxios to give head.
                // request = rxios.head<any>(uri);
                // break;
                throw new Error("HTTP method 'head' not supported.");

            case "options":
                // TODO: patch rxios to allow options.
                // request = rxios.options<any>(uri);
                // break;
                throw new Error("HTTP method 'head' not supported.");

            case "post":
                // TODO: patch rxios to have optional post data; it's already set on the axios instance.
                request = rxios.post<any>(uri, data);
                break;

            case "put":
                // TODO: patch rxios to have optional put data; it's already set on the axios instance.
                request = rxios.put<any>(uri, data);
                break;

            case "patch":
                // TODO: patch rxios to have optional patch data; it's already set on the axios instance.
                request = rxios.patch<any>(uri, data);
                break;

            default:
                throw new Error(`Unknown method: ${this.method}`);
        }

        const responseObserver: Observer<any> = {
            complete: () => {
                this.logger.trace("complete", "responseObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this.logger.error(error, "error", "responseObserver");
            },
            next: (response) => {
                // this.logger.trace(response, "next", "responseObserver");

                // TODO: better null handling.
                this.pollingSubject!.next(response);
            },
        };

        // const responseSubscription = request
        //     .pipe(
        //         tap((val) => this.logger.trace(val, uri, "response", "request")),
        //     )
        //     .subscribe(responseObserver);

        request.subscribe(responseObserver);
    }
}
