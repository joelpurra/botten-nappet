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

import Bluebird from "bluebird";
import {
    assert,
} from "check-types";
import Rx, {
    Observer, Subject, Subscription,
} from "rxjs";
import {
    Observable,
} from "rxjs/internal/Observable";

// import {
//     rxios as Rxios,
// } from "rxios";
import {
    rxios as Rxios,
} from "../../../lib/rxios";

import PinoLogger from "../../util/pino-logger";
import IConnection from "../iconnection";
import IHttpData from "./ihttp-data";
import IHttpHeaders from "./ihttp-header";
import IPollingConnection from "./ipolling-connection";

type DataHandler = (data: any) => void;
type DataFilter = (data: any) => boolean;
interface IDataHandlerObject {
    handler: DataHandler;
    filter: DataFilter;
}

export default abstract class PollingConnection<T, V> implements IPollingConnection<T, V> {
    private _pollingSubject: Subject<T> | null;
    private _sharedpollingObservable: Rx.Observable<T> | null;
    private _pollingSubcription: Subscription | null;
    protected _logger: PinoLogger;
    private _dataHandlerObjects: IDataHandlerObject[];
    private _intervalMinimumMilliseconds: number;
    private readonly _methods: string[] = [
        "get",
        "delete",
        "head",
        "options",
        "post",
        "put",
        "patch",
    ];
    private _defaultData: IHttpData | undefined;
    private _defaultHeaders: IHttpHeaders | undefined;
    private _method: string;
    private _uri: string;
    private _atBegin: boolean;
    private _intervalMilliseconds: number;

    constructor(
        logger: PinoLogger,
        intervalInMilliseconds: number,
        atBegin: boolean,
        uri: string,
        method: string,
        defaultHeaders?: IHttpHeaders,
        defaultData?: IHttpData,
    ) {
        assert(arguments.length === 5 || arguments.length === 6 || arguments.length === 7);
        assert.equal(typeof logger, "object");
        assert.number(intervalInMilliseconds);
        assert.greater(intervalInMilliseconds, 0);
        assert.equal(typeof atBegin, "boolean");
        assert.equal(typeof uri, "string");
        assert.greater(uri.length, 0);
        assert(uri.startsWith("https://"));
        assert.equal(typeof method, "string");
        assert.greater(method.length, 0);
        assert(typeof defaultHeaders === "undefined" || typeof defaultHeaders === "object");
        assert(typeof defaultData === "undefined" || typeof defaultData === "object");

        this._logger = logger.child("PollingConnection");
        this._intervalMilliseconds = intervalInMilliseconds;
        this._atBegin = atBegin;
        this._uri = uri;
        this._method = method;
        this._defaultHeaders = defaultHeaders;
        this._defaultData = defaultData;

        assert(this._methods.includes(this._method));

        this._intervalMinimumMilliseconds = 10 * 1000;

        assert(this._intervalMilliseconds >= this._intervalMinimumMilliseconds);

        this._pollingSubject = null;
        this._sharedpollingObservable = null;
        this._pollingSubcription = null;
        this._dataHandlerObjects = [];
    }

    public get dataObservable(): Rx.Observable<T> {
        assert.hasLength(arguments, 0);
        assert.not.null(this._sharedpollingObservable);

        // TODO: better null handling.
        return this._sharedpollingObservable!;
    }

    public async reconnect(): Promise<void> {
        assert.hasLength(arguments, 0);

        return this.disconnect()
            .then(() => this.connect());
    }

    public async _getAllHeaders(): Promise<IHttpHeaders> {
        assert.hasLength(arguments, 0);

        const overriddenHeaders = await this._getHeaders();

        const headers = {
            ...this._defaultHeaders,
            ...overriddenHeaders,
        };

        return headers;
    }

    public async connect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.null(this._pollingSubject);
        assert.null(this._pollingSubcription);

        const openedObserver: Observer<T> = {
            complete: () => {
                this._logger.trace("complete", "openedObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this._logger.error(error, "error", "openedObserver");
            },
            next: (message) => {
                this._logger.trace(message, "next", "openedObserver");
            },
        };

        this._pollingSubject = new Subject();

        this._pollingSubject.asObservable()
            .do((val) => this._logger.trace(val, "_pollingSubject"));

        this._sharedpollingObservable = this._pollingSubject.share()
            .do((val) => this._logger.trace(val, "Before merge", "_sharedpollingObservable"))
            .concatMap((message) => Rx.Observable.from(this._parseMessage(message)));

        this._pollingSubcription = this._sharedpollingObservable
            .subscribe(openedObserver);

        const intervalObservable = Rx.Observable.interval(this._intervalMilliseconds);

        const intervalObserver: Observer<number> = {
            complete: () => {
                this._logger.trace("complete", "intervalObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this._logger.error(error, "error", "intervalObserver");
            },
            next: (counter) => {
                this._logger.trace(counter, "next", "intervalObserver");

                this._send();
            },
        };

        const intervalSubscription = intervalObservable.subscribe(intervalObserver);

        if (this._atBegin === true) {
            this._logger.warn(this._atBegin, "_atBegin", "connect");
            this._send();
        }
    }

    public async disconnect(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.null(this._pollingSubject);
        assert.not.null(this._pollingSubcription);

        if (!(this._pollingSubject instanceof Subject)) {
            throw new TypeError("this._pollingSubject must be Subject");
        }

        if (!(this._pollingSubcription instanceof Subscription)) {
            throw new TypeError("this._pollingSubcription must be Subscription");
        }

        // TODO: verify that the refcount reaches 0 for a proper polling "close".
        // TODO: force polling termination after a "close" timeout.
        this._pollingSubcription.unsubscribe();
        this._pollingSubject.complete();
    }

    public async send(): Promise<void> {
        assert.hasLength(arguments, 0);

        this._logger.trace("send");

        // TODO: better null handling.
        await this._send();

        // if (resetInterval === true) {
        //     // TODO: unsubscribe/subscribe interval.
        //     // TODO: re-enable.
        //     this._logger.warn(resetInterval, "send");
        // }
    }

    protected abstract async _getHeaders(): Promise<IHttpHeaders>;

    protected abstract async _getData(): Promise<IHttpData>;

    protected async _dataHandler(data: any): Promise<void> {
        assert.hasLength(arguments, 1);

        const applicableHandlers = await Bluebird.filter(
            this._dataHandlerObjects,
            (dataHandler) => Promise.resolve(dataHandler.filter(data))
                .then((shouldHandle) => {
                    if (shouldHandle !== true) {
                        return false;
                    }

                    return true;
                })
                .catch((error) => {
                    this._logger.warn(error, `Masking error in dataHandler ${dataHandler.filter.name}`);

                    return false;
                }),
        );

        await Bluebird.each(
            applicableHandlers,
            (dataHandler) => Promise.resolve(dataHandler.handler(data))
                .catch((error) => {
                    this._logger.warn(error, `Masking error in dataHandler ${dataHandler.handler.name}`);

                    return undefined;
                }),
        );
    }

    protected async _parseMessage(rawMessage: any): Promise<T> {
        // TODO: parse outside this function?
        // TODO: try-catch for bad messages.
        const data: T = rawMessage as T;

        return data;
    }

    private async _getAllData(): Promise<IHttpData> {
        assert.hasLength(arguments, 0);

        const overriddenData = await this._getData();

        const data = {
            ...this._defaultData,
            ...overriddenData,
        };

        return data;
    }

    private async _send(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.null(this._pollingSubject);

        const [headers, data] = await Promise.all([
            this._getAllHeaders(),
            this._getAllData(),
        ]);

        const axiosInstanceConfig = {
            // TODO: don't pass URL both here and in rxios instance method call.
            baseURL: this._uri,
            // TODO: don't pass data both here and in rxios instance method call.
            data,
            headers,
            // TODO: don't pass method both here and in rxios instance method call.
            method: this._method,
        };

        // TODO: instantiate only once.
        const rxios = new Rxios(axiosInstanceConfig);

        let request: (Observable<any> | null) = null;

        // TODO: log sending data through the polling.
        switch (this._method) {
            case "get":
                request = rxios.get<any>(this._uri);
                break;

            case "delete":
                request = rxios.delete(this._uri);
                break;

            case "head":
                // TODO: patch rxios to give head.
                // request = rxios.head<any>(this._uri);
                // break;
                throw new Error("HTTP method 'head' not supported.");

            case "options":
                // TODO: patch rxios to allow options.
                // request = rxios.options<any>(this._uri);
                // break;
                throw new Error("HTTP method 'head' not supported.");

            case "post":
                // TODO: patch rxios to have optional post data; it's already set on the axios instance.
                request = rxios.post<any>(this._uri, data);
                break;

            case "put":
                // TODO: patch rxios to have optional put data; it's already set on the axios instance.
                request = rxios.put<any>(this._uri, data);
                break;

            case "patch":
                // TODO: patch rxios to have optional patch data; it's already set on the axios instance.
                request = rxios.patch<any>(this._uri, data);
                break;

            default:
                throw new Error(`Unknown method: ${this._method}`);
        }

        const responseObserver: Observer<any> = {
            complete: () => {
                this._logger.trace("complete", "openedObserver");
            },
            error: (error) => {
                // TODO: handle errors.
                this._logger.error(error, "error", "openedObserver");
            },
            next: (response) => {
                this._logger.trace(response, "next", "openedObserver");

                // TODO: better null handling.
                this._pollingSubject!.next(response);
            },
        };

        const responseSubscription = request
            .do((val) => this._logger.trace(val, this._uri, "response", "request"))
            .subscribe(responseObserver);
    }
}
