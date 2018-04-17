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

export default class SpeechManager {
    public volume: number;
    public rate: number;
    public pitch: number;

    constructor(
        private logger: ConsoleLog,
        private defaultVoiceName: string,
    ) {
        // HACK: warm up the system by "preloading" voices on Chromium.
        window.speechSynthesis.getVoices();

        this.pitch = 1;
        this.rate = 1;
        this.volume = 1;
    }

    public say(text: string) {
        this.logger.log("Saying", text.length, text);

        const voice = window.speechSynthesis
            .getVoices()
            .filter((v) => v.name === this.defaultVoiceName)[0];

        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.pitch = this.pitch;
        utterance.rate = this.rate;
        utterance.volume = this.volume;

        this.logger.log("Utterance", utterance, voice);

        // TODO: queue speech.
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }
}
