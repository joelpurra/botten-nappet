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
    Subscription,
} from "rxjs";
import {
    NextObserver,
} from "rxjs/internal/Observer";

import PinoLogger from "../util/pino-logger";
import IConnection from "./iconnection";

export default abstract class ConnectionManager<T, V> {
    // TODO: make connection private.
    protected _connection: IConnection<T, V>;
    private _dataHandlerSubscription: Subscription | null;
    protected _logger: PinoLogger;

    constructor(logger: PinoLogger, connection: IConnection<T, V>) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.equal(typeof connection, "object");

        this._logger = logger.child("ConnectionManager");
        this._connection = connection;
        this._dataHandlerSubscription = null;
    }

    public async start(): Promise<void> {
        assert(arguments.length === 0);
        assert.null(this._dataHandlerSubscription);

        const filter: ((data: T) => Promise<boolean>) = this._filter.bind(this);
        const dataHandler: ((data: T) => Promise<void>) = this._dataHandler.bind(this);

        const filteredDataObservable = this._connection.dataObservable
            .concatFilter((data: T) => Rx.Observable.from(filter(data)));

        const dataHandlerObserver: NextObserver<T> = {
            next: (data: T) => dataHandler(data),
        };

        this._dataHandlerSubscription = filteredDataObservable.subscribe(dataHandlerObserver);
    }

    public async stop(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.null(this._dataHandlerSubscription);

        // TODO: better null handling.
        this._dataHandlerSubscription!.unsubscribe();
    }

    protected abstract async _dataHandler(data: T): Promise<void>;
    protected abstract async _filter(data: T): Promise<boolean>;
}
