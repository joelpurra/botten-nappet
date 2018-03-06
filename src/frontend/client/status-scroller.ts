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

let repeat1: HTMLDivElement;
let repeat2: HTMLDivElement;
let currentTick: number;
let tickDelay: number;
let repeatInterval: any;
let maxContentOffset: number;

function tick() {
    // TODO: handle overflow.
    currentTick++;
}

function getOffset() {
    const SPEED_PIXELS = -1;

    const offset = ((-1 * currentTick) % maxContentOffset) + SPEED_PIXELS;

    return offset;
}

function asCssPixelString(i: number) {
    return i.toString(10) + "px";
}

function getOffsetRepeat1() {
    return asCssPixelString(getOffset());
}

function getOffsetRepeat2() {
    return asCssPixelString(getOffset() - (-maxContentOffset));
}

function start() {
    if (repeatInterval) {
        throw new Error("repeatInterval was set");
    }

    repeatInterval = setInterval(
        () => {
            tick();
            repeat1.style.marginTop = getOffsetRepeat1();
            repeat2.style.marginTop = getOffsetRepeat2();
        },
        tickDelay,
    );
}

function stop() {
    clearInterval(repeatInterval);
    repeatInterval = null;
}

function init() {
    repeat1 = document.getElementById("repeat1") as HTMLDivElement;
    repeat2 = document.getElementById("repeat2") as HTMLDivElement;

    currentTick = 0;
    tickDelay = 100;

    maxContentOffset = repeat1.clientHeight;

    repeat2.innerHTML = repeat1.innerHTML;

    repeat1.style.marginTop = getOffsetRepeat1();
    repeat2.style.marginTop = getOffsetRepeat2();
}

export default function statusScroller() {
    init();
    start();
}
