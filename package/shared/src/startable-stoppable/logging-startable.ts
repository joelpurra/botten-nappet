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

import IStartableStoppable from "@botten-nappet/shared/src/startable-stoppable/istartable-stoppable";

import PinoLogger from "@botten-nappet/shared/src/util/pino-logger";

@asrt(0)
export default abstract class LoggingStartable implements IStartableStoppable {
    protected abstract logger: PinoLogger;

    @asrt(0)
    public async start(): Promise<void> {
        this.logger.debug("Starting self-startable.");

        await this.loggedStart();

        this.logger.debug("Started self-startable.");
    }

    @asrt(0)
    public async stop(): Promise<void> {
        this.logger.debug("Stopping self-startable.");

        await this.loggedStop();

        this.logger.debug("Stopped self-startable.");
    }

    public abstract async loggedStart(): Promise<void>;
    public abstract async loggedStop(): Promise<void>;
}
