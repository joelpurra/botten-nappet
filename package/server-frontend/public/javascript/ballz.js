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

/*
Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
http://scratchdisk.com/ & http://jonathanpuckey.com/
All rights reserved.

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var Ball = function (point, text, colorOrUrl) {
    this.vector = Point.random() * 5;
    this.point = point;
    this.dampen = 0.4;
    this.gravity = 3;
    this.bounce = -0.6;

    var groupChildren = [];
    var radius = this.radius = 50 * Math.random() + 30;

    if (colorOrUrl && colorOrUrl.startsWith("https://")) {
        var image = new Raster(colorOrUrl);
        image.width = radius;
        image.height = radius;

        groupChildren.push(image);
    } else {
        var randomColor = {
            brightness: 1,
            hue: Math.random() * 360,
            saturation: 1,
        };

        var color = colorOrUrl || randomColor;

        var gradient = new Gradient([color, "black"], true);

        // Wrap CompoundPath in a Group, since CompoundPaths directly
        // applies the transformations to the content, just like Path.
        var ball = new CompoundPath({
            children: [
                new Path.Circle({
                    radius: radius,
                }),
                new Path.Circle({
                    center: radius / 8,
                    radius: radius / 3,
                }),
            ],
            fillColor: new Color(gradient, 0, radius, radius / 8),
        });

        groupChildren.push(ball);
    }

    if (typeof text === "string" && text.length > 0) {
        var ballText = new PointText({
            content: text,
            fillColor: "black",
            point: [radius / 2, radius],
        });

        groupChildren.push(ballText);
    }

    this.item = new Group({
        children: groupChildren,
        position: this.point,
        transformContent: false,
    });
};

Ball.prototype.iterate = function () {
    var size = view.size;
    this.vector.y += this.gravity;
    this.vector.x *= 0.99;
    var pre = this.point + this.vector;
    if (pre.x < this.radius || pre.x > size.width - this.radius) {
        this.vector.x *= -this.dampen;
    }
    if (pre.y < this.radius || pre.y > size.height - this.radius) {
        if (Math.abs(this.vector.x) < 3) {
            this.vector = Point.random() * [150, 100] + [-75, 20];
        }
        this.vector.y *= this.bounce;
    }

    var max = Point.max(this.radius, this.point + this.vector);
    this.item.position = this.point = Point.min(max, size - this.radius);
};

Ball.prototype.remove = function () {
    this.item.remove();
};

function createAndAddBall(event) {
    var point = (event && event.point) || Point.random() * view.size;
    var text = event.detail && event.detail.text;
    var colorOrUrl = event.detail && event.detail.colorOrUrl;
    var ballTimeoutMilliseconds = (event.detail && event.detail.ballTimeout) || 1000;

    var ball = new Ball(point, text, colorOrUrl);

    function removeBall() {
        ball.remove();
        balls = balls.filter(function (b) {
            return b !== ball;
        });
    }

    setTimeout(removeBall, ballTimeoutMilliseconds);

    balls.push(ball);
}

function onFrame(event) {
    // if ((event.count % 2) === 0) {
    //     return;
    // }

    millisecondsSinceLastRender += (event.delta * 1000);

    if (millisecondsSinceLastRender < minimumMillisecondsBetweenRender) {
        return;
    }

    millisecondsSinceLastRender = 0;

    for (var i = 0, l = balls.length; i < l; i++) {
        balls[i].iterate();
    }
}

function init() {
    var initialBallCount = 1;
    var initialBallsText = "!animate";
    var initialBallTimeout = 1 * 60 * 60 * 1000;

    var fakeEvent = {
        detail: {
            ballTimeout: initialBallTimeout,
            text: initialBallsText,
        },
    };

    for (var i = 0; i < initialBallCount; i++) {
        createAndAddBall(fakeEvent);
    }

    // TODO: listen only on the canvas element?
    document.addEventListener("add-ball", function (event) {
        createAndAddBall(event);
    });
}

var balls = [];

// NOTE: attempting to limit the frames per second.
// If not, the CPU usage goes through the roof.
// Assuming that it's an optimization to not change ball positions more often than N times per second.
var targetFps = 10;
var minimumMillisecondsBetweenRender = ((1000 / targetFps) * 0.99);
var millisecondsSinceLastRender = Number.MAX_SAFE_INTEGER / 2;

init();
