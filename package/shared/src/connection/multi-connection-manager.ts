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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";
import IStartableStoppable from "../startable-stoppable/istartable-stoppable";
import IReceivingConnection from "./ireceiving-connection";

export default abstract class MultiConnectionManager<T> implements IStartableStoppable {
    protected logger: PinoLogger;
    private dataHandlerSubscription: Subscription | null;

    constructor(
        logger: PinoLogger,
        // TODO: make connection private.
        protected connections: Array<IReceivingConnection<T>>,
    ) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof logger, "object");
        assert.nonEmptyArray(connections);

        this.logger = logger.child(this.constructor.name);

        this.dataHandlerSubscription = null;
    }

    public async start(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.null(this.dataHandlerSubscription);

        const filter: ((data: T) => Promise<boolean>) = this.filter.bind(this);
        const dataHandler: ((data: T) => Promise<void>) = this.dataHandler.bind(this);

        const filteredDataObservable = Rx.Observable.from(
            this.connections.map((connection) => connection.dataObservable),
        )
            .mergeAll()
            .concatFilter((data: T) => Rx.Observable.from(filter(data)));

        const dataHandlerObserver: NextObserver<T> = {
            next: (data: T) => dataHandler(data),
        };

        this.dataHandlerSubscription = filteredDataObservable.subscribe(dataHandlerObserver);
    }

    public async stop(): Promise<void> {
        assert.hasLength(arguments, 0);
        assert.not.null(this.dataHandlerSubscription);

        // TODO: better null handling.
        this.dataHandlerSubscription!.unsubscribe();
    }

    protected abstract async dataHandler(data: T): Promise<void>;
    protected abstract async filter(data: T): Promise<boolean>;
}
