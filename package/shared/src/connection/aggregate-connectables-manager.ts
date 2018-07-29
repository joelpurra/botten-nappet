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

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

import IConnectable from "@botten-nappet/shared/src/connection/iconnectable";

@asrt(2)
export default abstract class AggregateConnectablesManager implements IConnectable {
    private logger: PinoLogger;

    constructor(
        @asrt() logger: PinoLogger,
        @asrt() private readonly connectables: IConnectable[],
    ) {
        assert.positive(this.connectables.length);

        this.logger = logger.child(this.constructor.name);
    }

    @asrt(0)
    public async connect(): Promise<void> {
        this.logger.debug(`Connecting ${this.connectables.length} connectables.`);

        await Bluebird.map(this.connectables, async (connectable) => await connectable.connect());

        this.logger.debug(`Connected ${this.connectables.length} connectables.`);

        this.logger.debug("Connecting self-connectable.");

        await this.selfConnect();

        this.logger.debug("Connected self-connectable.");
    }

    @asrt(0)
    public async disconnect(): Promise<void> {
        this.logger.debug("Connecting self-connectable.");

        await this.selfDisconnect();

        this.logger.debug("Connected self-connectable.");

        this.logger.debug(`Disconnecting ${this.connectables.length} connectables.`);

        await Bluebird.map(
            this.connectables,
            async (connectable, index, arrayLength) => {
                try {
                    await connectable.disconnect();
                } catch (error) {
                    this.logger.error(
                        error,
                        connectable,
                        // TODO: improved IConnectable naming?
                        `Swallowed error while stopping connectable #${index} of ${arrayLength}: ${connectable}`,
                    );
                }
            },
        );

        this.logger.debug(`Disconnected ${this.connectables.length} connectables.`);
    }

    @asrt(0)
    public async reconnect(): Promise<void> {
        await this.disconnect();
        await this.connect();
    }

    @asrt(0)
    public async isConnected(): Promise<boolean> {
        const connectablesIsConnected = await Bluebird.map(
            this.connectables,
            async (connectable) => await connectable.isConnected(),
        );

        const isConnected = connectablesIsConnected.every((b) => b);

        return isConnected;
    }

    public abstract async loadConnectables(): Promise<void>;
    public abstract async selfConnect(): Promise<void>;
    public abstract async selfDisconnect(): Promise<void>;
}
