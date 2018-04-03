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
    concatFilter,
} from "@botten-nappet/backend-shared/lib/rxjs-extensions/async-filter";
import {
    asrt,
} from "@botten-nappet/shared/src/util/asrt";
import {
    assert,
} from "check-types";
import {
    from,
    NextObserver,
    Subscription,
} from "rxjs";
import {
    mergeAll,
} from "rxjs/operators";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";
import IStartableStoppable from "../startable-stoppable/istartable-stoppable";

import IReceivingConnection from "./ireceiving-connection";

@asrt(2)
export default abstract class MultiConnectionManager<T> implements IStartableStoppable {
    protected logger: PinoLogger;
    private dataHandlerSubscription: Subscription | null;

    constructor(
        @asrt() logger: PinoLogger,
        // TODO: make connection private.
        @asrt() protected connections: Array<IReceivingConnection<T>>,
    ) {
        assert.nonEmptyArray(connections);

        this.logger = logger.child(this.constructor.name);

        this.dataHandlerSubscription = null;
    }

    @asrt(0)
    public async start(): Promise<void> {
        assert.null(this.dataHandlerSubscription);

        const filter: ((data: T) => Promise<boolean>) = this.filter.bind(this);
        const dataHandler: ((data: T) => Promise<void>) = this.dataHandler.bind(this);

        const filteredDataObservable = from(
            this.connections.map((connection) => connection.dataObservable),
        )
            .pipe(mergeAll())
            .pipe(concatFilter((data: T) => from(filter(data))));

        const dataHandlerObserver: NextObserver<T> = {
            next: (data: T) => dataHandler(data),
        };

        this.dataHandlerSubscription = filteredDataObservable.subscribe(dataHandlerObserver);
    }

    @asrt(0)
    public async stop(): Promise<void> {
        assert.not.null(this.dataHandlerSubscription);

        // TODO: better null handling.
        this.dataHandlerSubscription!.unsubscribe();
    }

    protected abstract async dataHandler(data: T): Promise<void>;
    protected abstract async filter(data: T): Promise<boolean>;
}
