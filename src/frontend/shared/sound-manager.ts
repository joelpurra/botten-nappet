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

import ConsoleLog from "./console-log";

type SoundGroup = Array<{ id: string; name: string; }>;

export default class SoundManager {
    private groups: {
        [key: string]: SoundGroup;
    };
    private cowbellRootPath: string;

    constructor(
        private logger: ConsoleLog,
        private soundRootPath: string,
    ) {
        // TODO: path.join();
        this.cowbellRootPath = `${this.soundRootPath}/cowbell`;

        this.groups = {
            cowbell: [
                {
                    id: "cowbell-a",
                    name: "Gotta have more cowbell.mp3",
                },
                {
                    id: "cowbell-b",
                    name: "Gotta have more.mp3",
                },
                {
                    id: "cowbell-c",
                    name: "I could have used more cowbell.mp3",
                },
                {
                    id: "cowbell-d",
                    name: "More cowbell.mp3",
                },
            ],
        };

        this.groups.cowbell.forEach((cowbell) => {
            createjs.Sound.registerSound({
                id: cowbell.id,
                // TODO: path.join();
                src: `${this.cowbellRootPath}/${cowbell.name}`,
            });
        });
    }

    public playRandom(soundGroup: string) {
        const group = this.groups[soundGroup];

        // TODO: use random library.
        const rnd = Math.floor(Math.random() * group.length);
        const soundId = group[rnd].id;
        this.play(soundId);

    }

    public play(soundId: string) {
        this.logger.log("Playing sound", soundId);

        createjs.Sound.play(soundId);
    }
}
