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

const packageJSON = require("./package.json");

const packageJSONScriptNames = Object.keys(packageJSON.scripts);

const serviceNames = packageJSONScriptNames
    .filter(
        (scriptName) => scriptName.startsWith("start:")
    )
    .map((scriptName) => scriptName.split(":").slice(1).join(":"));

const apps = serviceNames.map((serviceName) => {
    const app = {
        name: serviceName,
        script: "npm",
        args: `run --silent start:${serviceName}`,
        kill_timeout: 60 * 1000
    };

    return app;
})

module.exports = {
    apps: apps,
};
