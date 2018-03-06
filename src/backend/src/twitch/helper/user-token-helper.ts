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

import Bluebird from "bluebird";
import {
    assert,
} from "check-types";

import readline from "readline";

import axios from "axios";
import qs from "qs";
import PinoLogger from "../../../../shared/src/util/pino-logger";
import IUser from "../../storage/iuser";
import UserStorageManager from "../../storage/manager/user-storage-manager";
import IAugmentedToken from "../authentication/iaugmented-token";
import IRawToken from "../authentication/iraw-token";
import CSRFHelper from "./csrf-helper";
import RequestHelper from "./request-helper";

export default class UserTokenHelper {
    private appClientSecret: string;
    private appClientId: string;
    private oauthTokenUri: string;
    private appOAuthRedirectUrl: string;
    private oauthAuthorizationUri: string;
    private requestHelper: RequestHelper;
    private userStorageHelper: UserStorageManager;
    private csrfHelper: CSRFHelper;
    private logger: PinoLogger;

    constructor(
        logger: PinoLogger,
        csrfHelper: CSRFHelper,
        userStorageManager: UserStorageManager,
        requestHelper: RequestHelper,
        oauthAuthorizationUri: string,
        appOAuthRedirectUrl: string,
        oauthTokenUri: string,
        appClientId: string,
        appClientSecret: string,
    ) {
        assert.hasLength(arguments, 9);
        assert.equal(typeof logger, "object");
        assert.equal(typeof csrfHelper, "object");
        assert.equal(typeof userStorageManager, "object");
        assert.equal(typeof requestHelper, "object");
        assert.nonEmptyString(oauthAuthorizationUri);
        assert(oauthAuthorizationUri.startsWith("https://"));
        assert.nonEmptyString(appOAuthRedirectUrl);
        assert(appOAuthRedirectUrl.startsWith("https://"));
        assert.nonEmptyString(oauthTokenUri);
        assert(oauthTokenUri.startsWith("https://"));
        assert.nonEmptyString(appClientId);
        assert.nonEmptyString(appClientSecret);

        this.logger = logger.child("UserTokenHelper");
        this.csrfHelper = csrfHelper;
        this.userStorageHelper = userStorageManager;
        this.requestHelper = requestHelper;
        this.oauthAuthorizationUri = oauthAuthorizationUri;
        this.appOAuthRedirectUrl = appOAuthRedirectUrl;
        this.oauthTokenUri = oauthTokenUri;
        this.appClientId = appClientId;
        this.appClientSecret = appClientSecret;
    }

    public async getUserTokenFromUserTerminalPrompt(): Promise<IRawToken> {
        assert.hasLength(arguments, 0);

        // https://dev.twitch.tv/docs/authentication#oauth-authorization-code-flow-user-access-tokens
        // const sampleResponse = {
        //     "access_token": "0123456789abcdefghijABCDEFGHIJ",
        //     "refresh_token": "eyJfaWQmNzMtNGCJ9%6VFV5LNrZFUj8oU231/3Aj",
        //     "expires_in": 3600,
        //     "scope": "viewing_activity_read",
        // };

        // TODO: replace with an https server.
        const code = await this.getUserAuthorizationCode();

        assert.nonEmptyString(code);

        const data = {
            client_id: this.appClientId,
            client_secret: this.appClientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: this.appOAuthRedirectUrl,
        };

        const serializedData = this.requestHelper.twitchQuerystringSerializer(data);

        // TODO: use an https class.
        const response = await axios.post(this.oauthTokenUri, serializedData);

        // NOTE: axios response data.
        // TODO: verify token format.
        const rawToken: IRawToken = response.data;

        this.logger.trace(rawToken, "getUserTokenFromUserTerminalPrompt");

        return rawToken;
    }

    public async getUserTokenFromDatabase(username: string): Promise<IAugmentedToken | null> {
        assert.hasLength(arguments, 1);
        assert.nonEmptyString(username);

        const user = await this.userStorageHelper.getByUsername(username);

        const isValidUserToken = (
            user
            && user.twitchToken !== null
            && typeof user.twitchToken === "object"
            && user.twitchToken.token !== null
            && typeof user.twitchToken.token === "object"
            && typeof user.twitchToken.token.access_token === "string"
        );

        let token = null;

        if (isValidUserToken) {
            token = user.twitchToken;
        }

        this.logger.trace(token, "getUserTokenFromDatabase");

        return token;
    }

    public async store(username: string, rawToken: IRawToken): Promise<IAugmentedToken> {
        assert.hasLength(arguments, 2);
        assert.nonEmptyString(username);
        assert.not.null(rawToken);
        assert.equal(typeof rawToken, "object");
        assert.equal(typeof rawToken.access_token, "string");

        const userAfterStoring = await this.userStorageHelper.storeToken(username, rawToken);

        const augmentedToken: IAugmentedToken = userAfterStoring.twitchToken;

        this.logger.trace(augmentedToken, "store");

        return augmentedToken;
    }

    public async forget(username: string): Promise<IUser> {
        assert.hasLength(arguments, 1);
        assert.nonEmptyString(username);

        const userAfterStoring = await this.userStorageHelper.storeToken(username, null);

        this.logger.trace(userAfterStoring, "forgetUserToken");

        return userAfterStoring;
    }

    public async get(username: string): Promise<IAugmentedToken> {
        assert.hasLength(arguments, 1);
        assert.nonEmptyString(username);

        let result = null;

        const tokenFromDatabase = await this.getUserTokenFromDatabase(username);

        if (tokenFromDatabase) {
            result = tokenFromDatabase;
        } else {
            const rawToken = await this.getUserTokenFromUserTerminalPrompt();
            const tokenFromUserTerminalPrompt = await this.store(username, rawToken);

            result = tokenFromUserTerminalPrompt;
        }

        this.logger.trace(result, "getUserToken");

        return result;
    }

    public async refresh(tokenToRefresh: IAugmentedToken): Promise<IRawToken> {
        assert.hasLength(arguments, 1);
        assert.not.null(tokenToRefresh);
        assert.equal(typeof tokenToRefresh, "object");
        assert.not.null(tokenToRefresh.token);
        assert.equal(typeof tokenToRefresh.token, "object");

        const data = {
            client_id: this.appClientId,
            client_secret: this.appClientSecret,
            grant_type: "refresh_token",
            // TODO: better null handling.
            refresh_token: tokenToRefresh.token!.refresh_token,
        };

        const serializedData = this.requestHelper.twitchQuerystringSerializer(data);

        // TODO: use an https class.
        const response = await axios.post(this.oauthTokenUri, serializedData);

        // NOTE: axios response data.
        // TODO: verify reponse data.
        const rawRefreshedToken: IRawToken = response.data;

        this.logger.trace(rawRefreshedToken, tokenToRefresh, "get");

        return rawRefreshedToken;
    }

    private async getUserAuthorizationUrl(randomCSRF: string): Promise<string> {
        assert.hasLength(arguments, 1);
        assert.nonEmptyString(randomCSRF);

        // TODO: configure scopes per request or per activity/subclass.
        // https://dev.twitch.tv/docs/authentication#scopes
        const scopes = [
            "channel_feed_read",
            "channel_subscriptions",
            "chat_login",
        ];
        const serializedScopes = scopes.join(" ");

        const params = {
            client_id: this.appClientId,
            force_verify: "true",
            redirect_uri: this.appOAuthRedirectUrl,
            response_type: "code",
            scope: serializedScopes,
            state: randomCSRF,
        };

        const serializedParams = this.requestHelper.twitchQuerystringSerializer(params);

        const url = `${this.oauthAuthorizationUri}?${serializedParams}`;

        return url;
    }

    private async parseCodeFromAnswer(answer: string, randomCSRF: string): Promise<string> {
        assert.hasLength(arguments, 2);
        assert.nonEmptyString(answer);
        assert.nonEmptyString(randomCSRF);

        const paramsRx = /\?(.+)$/i;

        let code = null;

        if (paramsRx.test(answer)) {
            const matches = paramsRx.exec(answer);

            // TODO: better null handling.
            assert.not.null(matches);

            const querystring = matches![1];

            const params = qs.parse(querystring);

            // NOTE: security check.
            if (params.state !== randomCSRF) {
                throw new Error("Random CSRF mismatch.");
            }

            code = params.code;
        } else {
            code = answer;
        }

        assert.nonEmptyString(code);

        return code;
    }

    private async promptForCodeOrUrl(): Promise<string> {
        assert.hasLength(arguments, 0);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const answer = await new Bluebird<string>((resolve, reject) => {
            try {
                rl.question("Paste the code or full url: ", (readlineAnswer) => resolve(readlineAnswer));
            } catch (error) {
                reject(error);
            }
        });

        await rl.close();

        assert.nonEmptyString(answer);

        return answer;
    }

    private async promptToOpenAuthorizationUrl(userAuthorizationUrl: string): Promise<void> {
        assert.hasLength(arguments, 1);
        assert.nonEmptyString(userAuthorizationUrl);
        assert(userAuthorizationUrl.startsWith("https://"));

        /* tslint:disable:no-console */
        console.info("Open this url and authorize the application:", userAuthorizationUrl);
        /* tslint:enable:no-console */
    }

    private async getUserAuthorizationCode(): Promise<string> {
        assert.hasLength(arguments, 0);

        // TODO: replace with an https server.
        const randomCSRF = await this.csrfHelper.getRandomCSRF();

        const userAuthorizationUrl = await this.getUserAuthorizationUrl(randomCSRF);

        await this.promptToOpenAuthorizationUrl(userAuthorizationUrl);

        const answer = await this.promptForCodeOrUrl();
        const code = await this.parseCodeFromAnswer(answer, randomCSRF);

        assert.nonEmptyString(code);

        return code;
    }
}