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
    autoinject,
} from "aurelia-framework";
import {
    assert,
} from "check-types";

import crypto from "crypto";
import os from "os";

import axios from "axios";
import moment from "moment";

import BackendConfig from "@botten-nappet/backend-shared/src/config/backend-config";
import SharedConfig from "@botten-nappet/shared/src/config/shared-config";

import IClientContext from "./iclient-context";

@autoinject
export default class AuthenticatedRequest {
    constructor(
        private readonly backendConfig: BackendConfig,
        private readonly sharedConfig: SharedConfig,
    ) {
        assert.hasLength(arguments, 2);
        assert.equal(typeof backendConfig, "object");
        assert.equal(typeof sharedConfig, "object");
    }

    public async request<T>(method: string, url: string, params: object): Promise<T> {
        assert.hasLength(arguments, 3);
        assert.nonEmptyString(method);
        assert.nonEmptyString(url);
        assert(url.startsWith("https://"));
        assert(url.startsWith(this.backendConfig.vidyRootUrl));
        assert.not.null(params);
        assert.equal(typeof params, "object");

        const headers = await this.getHeaders(method, url);

        // TODO: use an https class.
        const response = await axios.post(
            url,
            params,
            {
                headers,
            },
        );

        // NOTE: axios response data.
        const data = response.data;

        return data as T;
    }

    public async get<T>(url: string, params: object): Promise<T> {
        return this.request<T>("get", url, params);
    }

    public async post<T>(url: string, params: object): Promise<T> {
        return this.request<T>("post", url, params);
    }

    private stringToBase64(str: string): string {
        // TODO: use library.
        return Buffer.from(str, "utf8").toString("base64");
    }

    private async getHeaders(method: string, url: string): Promise<object> {
        assert.hasLength(arguments, 2);
        assert.nonEmptyString(method);
        assert.nonEmptyString(url);
        assert(url.startsWith("https://"));
        assert(url.startsWith(this.backendConfig.vidyRootUrl));

        const hmac = crypto.createHmac("sha256", this.backendConfig.vidyKeySecret);
        const relativeUrl = "/" + url.replace(this.backendConfig.vidyRootUrl, "");

        const contentType = "application/json;charset=utf-8";
        const dateHeader = new Date().toUTCString();

        const clientContext = await this.getClientContext();
        const clientContextHeader = this.stringToBase64(JSON.stringify(clientContext));

        const signedHeaders: any = {
            "(request-target)": `${method} ${relativeUrl}`,
            "content-type": contentType,
            "date": dateHeader,
            "x-client-context": clientContextHeader,
        };

        const signingHeaderKeys = Object.keys(signedHeaders);
        const signingHeaderKeysString = signingHeaderKeys.join(" ");
        const signingString = signingHeaderKeys
            .map((headerKey) => `${headerKey}: ${signedHeaders[headerKey]}`)
            .join("\n");
        hmac.update(signingString);
        const signingStringHash = hmac.digest("base64");
        const clientAuthorizationHeader =
            `Signature keyId="${
            this.backendConfig.vidyKeyId
            }",algorithm="hmac-sha256",headers="${
            signingHeaderKeysString
            }",signature="${
            signingStringHash
            }"`;

        const headers = {
            "content-type": contentType,
            "date": dateHeader,
            "x-client-authorization": clientAuthorizationHeader,
            "x-client-context": clientContextHeader,
        };

        return headers;
    }

    private async getClientContext(): Promise<IClientContext> {
        // TODO: figure out better values for servers.
        const clientContext: IClientContext = {
            app: {
                build: 0,
                name: this.sharedConfig.applicationName,
                version: this.sharedConfig.version,
            },
            device: {
                id: this.backendConfig.vidySystemUuid,
                manufacturer: os.platform(),
                model: os.release(),
                name: os.platform(),
                type: "other",
            },
            locale: "en-US",
            os: {
                name: os.platform(),
                version: os.release(),
            },

            // TODO: store localtime as Date, move serialization deeper in the code?
            // YYYY-MM-DDThh:mm:ss.mm-hh:mm (RFC 3339, explicit timezone offset)
            localtime: moment().format(),
        };

        return clientContext;
    }
}
