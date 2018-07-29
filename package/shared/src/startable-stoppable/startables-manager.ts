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
import LoggingStartable from "@botten-nappet/shared/src/startable-stoppable/logging-startable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

@asrt(0)
export default abstract class StartablesManager extends LoggingStartable {
    protected startables: IStartableStoppable[] = [];
    protected abstract logger: PinoLogger;

    @asrt(0)
    public async loggedStart(): Promise<void> {
        assert.hasLength(this.startables, 0);

        await this.loadStartables();

        // assert.positive(this.startables.length);

        if (this.startables.length === 0) {
            this.logger.warn("No startables found.");
        }

        this.logger.trace(`Starting ${this.startables.length} startables.`);

        await Bluebird.map(
            this.startables,
            async (startable, index, arrayLength) => {
                try {
                    await startable.start();
                } catch (error) {
                    this.logger.error(
                        error,
                        // startable,
                        // TODO: improved IStartableStoppable naming?
                        `Swallowed error while starting startable #${index} of ${arrayLength}`,
                    );
                }
            },
        );

        this.logger.trace(`Started ${this.startables.length} startables.`);

        this.logger.trace("Handing over starting to self-startable.");

        await this.managedStart();

        this.logger.trace("Back from starting self-startable.");
    }

    @asrt(0)
    public async loggedStop(): Promise<void> {
        this.logger.trace("Handing over stopping to self-startable.");

        await this.managedStop();

        this.logger.trace("Back from stopping self-startable.");

        this.logger.trace(`Stopping ${this.startables.length} startables.`);

        await Bluebird.map(
            this.startables,
            async (startable, index, arrayLength) => {
                try {
                    await startable.stop();
                } catch (error) {
                    this.logger.error(
                        error,
                        // startable,
                        // TODO: improved IStartableStoppable naming?
                        `Swallowed error while stopping startable #${index} of ${arrayLength}`,
                    );
                }
            },
        );

        this.logger.trace(`Stopped ${this.startables.length} startables.`);
    }

    public abstract async loadStartables(): Promise<void>;
    public abstract async managedStart(): Promise<void>;
    public abstract async managedStop(): Promise<void>;
}
