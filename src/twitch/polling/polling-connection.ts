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

import axios, {
    AxiosInstance,
} from "axios";

import PinoLogger from "../../util/pino-logger";
import IConnection from "../iconnection";
import IHttpData from "./ihttp-data";
import IHttpHeaders from "./ihttp-header";

type KillSwitch = () => void;
type DataHandler = (data: any) => void;
type DataFilter = (data: any) => boolean;
interface IDataHandlerObject {
    handler: DataHandler;
    filter: DataFilter;
}

export default abstract class PollingConnection implements IConnection {
    protected _logger: PinoLogger;
    private _dataHandlerObjects: IDataHandlerObject[];
    private _intervalId: (number | NodeJS.Timer | null);
    private _axios: (AxiosInstance | null);
    private _intervalMinMilliseconds: number;
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
    private _interval: number;

    constructor(
        logger: PinoLogger,
        interval: number,
        atBegin: boolean,
        uri: string,
        method: string,
        defaultHeaders?: IHttpHeaders,
        defaultData?: IHttpData,
    ) {
        assert(arguments.length === 5 || arguments.length === 6 || arguments.length === 7);
        assert.equal(typeof logger, "object");
        assert.number(interval);
        assert.greater(interval, 0);
        assert.equal(typeof atBegin, "boolean");
        assert.equal(typeof uri, "string");
        assert.greater(uri.length, 0);
        assert(uri.startsWith("https://"));
        assert.equal(typeof method, "string");
        assert.greater(method.length, 0);
        assert(typeof defaultHeaders === "undefined" || typeof defaultHeaders === "object");
        assert(typeof defaultData === "undefined" || typeof defaultData === "object");

        this._logger = logger.child("PollingConnection");
        this._interval = interval;
        this._atBegin = atBegin;
        this._uri = uri;
        this._method = method;
        this._defaultHeaders = defaultHeaders;
        this._defaultData = defaultData;

        assert(this._methods.includes(this._method));

        this._intervalMinMilliseconds = 10 * 1000;

        assert(this._interval >= this._intervalMinMilliseconds);

        this._axios = null;
        this._intervalId = null;
        this._dataHandlerObjects = [];
    }

    public async _getAllHeaders(): Promise<IHttpHeaders> {
        assert.equal(arguments.length, 0);

        const overriddenHeaders = await this._getHeaders();

        const headers = {
            ...this._defaultHeaders,
            ...overriddenHeaders,
        };

        return headers;
    }

    public abstract async _getHeaders(): Promise<IHttpHeaders>;

    public async _getAllData(): Promise<IHttpData> {
        assert.equal(arguments.length, 0);

        const overriddenData = await this._getData();

        const data = {
            ...this._defaultData,
            ...overriddenData,
        };

        return data;
    }

    public abstract async _getData(): Promise<IHttpData>;

    public async _setConnection(headers: IHttpHeaders, data: IHttpData) {
        assert.equal(arguments.length, 2);
        assert.equal(typeof headers, "object");
        assert.equal(typeof data, "object");

        assert.equal(this._axios, null);

        const axiosInstanceConfig = {
            baseURL: this._uri,
            // NOTE: per-instance method has no effect due to bug in axios, must use per request.
            // TODO: remove per-call overrides once axios has been fixed.
            // https://github.com/axios/axios/issues/723
            data,
            headers,
            method: this._method,
        };

        this._axios = axios.create(axiosInstanceConfig);

        return undefined;
    }

    public async _unsetConnection() {
        assert.equal(arguments.length, 0);

        assert.not.equal(this._axios, null);

        this._axios = null;

        return undefined;
    }

    public async _startInterval(): Promise<void> {
        assert.equal(arguments.length, 0);

        assert.not.equal(this._axios, null);

        this._intervalId = setInterval(this._poll.bind(this), this._interval);
    }

    public async connect(): Promise<void> {
        assert.equal(arguments.length, 0);
        assert.equal(this._axios, null);
        assert.equal(this._intervalId, null);

        const [headers, data] = await Promise.all([
            this._getAllHeaders(),
            this._getAllData(),
        ]);

        this._setConnection(headers, data);

        if (this._atBegin === true) {
            return this._poll();
        }

        return this._startInterval();
    }

    public async _stopInterval(): Promise<void> {
        assert.not.equal(this._axios, null);
        assert.not.equal(this._intervalId, null);

        clearInterval(this._intervalId as NodeJS.Timer);

        this._intervalId = null;
    }

    public async disconnect(): Promise<void> {
        assert.not.equal(this._axios, null);
        assert.not.equal(this._intervalId, null);

        await this._stopInterval();
        return this._unsetConnection();
    }

    public async force(resetInterval: boolean): Promise<void> {
        assert.equal(arguments.length, 1);
        assert.equal(typeof resetInterval, "boolean");

        assert.not.equal(this._axios, null);
        assert.not.equal(this._intervalId, null);

        this._logger.trace(resetInterval, "force");
        await this._poll();

        if (resetInterval === true) {
            return this._stopInterval()
                .then(() => this._startInterval());
        }
    }

    public async _poll(): Promise<void> {
        assert.equal(arguments.length, 0);
        assert.not.null(this._axios);

        // TODO: better null checking?
        if (this._axios == null) {
            throw new ReferenceError("_axios");
        }

        try {
            const response = await this._axios.request({
                // NOTE: per-instance method has no effect due to bug in axios, must use per request.
                // TODO: remove per-call overrides once axios has been fixed.
                // https://github.com/axios/axios/issues/723
                method: this._method,
            });

            this._logger.trace(response.data, response.status, response.statusText, "_poll");

            const data = response.data;

            return this._dataHandler(data);
        } catch (error) {
            this._logger.error(error, "Masking polling error", "_poll");

            return undefined;
        }
    }

    public async _dataHandler(data: any): Promise<void> {
        assert.equal(arguments.length, 1);

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

    public async listen(handler: DataHandler, filter: DataFilter): Promise<KillSwitch> {
        assert.equal(arguments.length, 2);
        assert.equal(typeof handler, "function");
        assert.equal(typeof filter, "function");

        const dataHandlerObject: IDataHandlerObject = {
            filter,
            handler,
        };

        this._dataHandlerObjects.push(dataHandlerObject);

        const killSwitch = () => {
            this._dataHandlerObjects = this._dataHandlerObjects
                .filter((_dataHandlerObject) => _dataHandlerObject !== dataHandlerObject);
        };

        return killSwitch;
    }
}
