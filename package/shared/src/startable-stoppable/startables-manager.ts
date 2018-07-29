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

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

@asrt(0)
export default abstract class StartablesManager implements IStartableStoppable {
    protected startables: IStartableStoppable[] = [];
    protected abstract logger: PinoLogger;

    @asrt(0)
    public async start(): Promise<void> {
        await this.loadStartables();

        assert.positive(this.startables.length);

        this.logger.debug(`Starting ${this.startables.length} startables.`);

        await Bluebird.map(this.startables, async (startable) => await startable.start());

        this.logger.debug(`Started ${this.startables.length} startables.`);

        this.logger.debug("Starting self-startable.");

        await this.selfStart();

        this.logger.debug("Started self-startable.");
    }

    @asrt(0)
    public async stop(): Promise<void> {

        this.logger.debug("Starting self-startable.");

        await this.selfStop();

        this.logger.debug("Started self-startable.");

        this.logger.debug(`Stopping ${this.startables.length} startables.`);

        await Bluebird.map(
            this.startables,
            async (startable, index, arrayLength) => {
                try {
                    await startable.stop();
                } catch (error) {
                    this.logger.error(
                        error,
                        startable,
                        // TODO: improved IStartableStoppable naming?
                        `Swallowed error while stopping startable #${index} of ${arrayLength}: ${startable}`,
                    );
                }
            },
        );

        this.logger.debug(`Stopped ${this.startables.length} startables.`);
    }

    public abstract async loadStartables(): Promise<void>;
    public abstract async selfStart(): Promise<void>;
    public abstract async selfStop(): Promise<void>;
}
