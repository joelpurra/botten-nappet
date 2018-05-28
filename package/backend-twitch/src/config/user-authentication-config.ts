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
import {
    autoinject,
} from "aurelia-dependency-injection";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";

@asrt(1)
@autoinject
export default class UserAuthenticationConfig {
    constructor(
        @asrt() private readonly backendConfig: BackendConfig,
    ) { }

    public get twitchAppClientId(): string {
        return this.backendConfig.twitchAppClientId;
    }

    public get twitchAppClientSecret(): string {
        return this.backendConfig.twitchAppClientSecret;
    }

    public get twitchAppOAuthRedirectUrl(): string {
        return this.backendConfig.twitchAppOAuthRedirectUrl;
    }

    public get twitchOAuthAuthorizationUri(): string {
        return this.backendConfig.twitchOAuthAuthorizationUri;
    }

    public get twitchOAuthTokenUri(): string {
        return this.backendConfig.twitchOAuthTokenUri;
    }

    public get twitchUserName(): string {
        return this.backendConfig.twitchUserName;
    }

    public get twitchChannelName(): string {
        return this.backendConfig.twitchChannelName;
    }

    public get twitchUsersDataUri(): string {
        return this.backendConfig.twitchUsersDataUri;
    }
}
