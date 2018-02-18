// https://github.com/davguij/rxios
//
// NOTE: remove this file once rxios targets rxjs v6.
// https://github.com/davguij/rxios/pull/2

/*
The MIT License (MIT)

Copyright (c) 2017 David Guijarro

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import axios, { AxiosInstance, AxiosPromise, AxiosRequestConfig } from "axios";
import { Observable } from "rxjs";

export interface rxiosConfig extends AxiosRequestConfig {
    localCache?: boolean;
}

export class rxios {
    private _httpClient: AxiosInstance;

    constructor(private options: rxiosConfig = {}) {
        this._httpClient = axios.create(options);
    }

    private _makeRequest<T>(method: string, url: string, queryParams?: object, body?: object) {
        let request: AxiosPromise<T>;
        switch (method) {
            case "GET":
                request = this._httpClient.get<T>(url, { params: queryParams });
                break;
            case "POST":
                request = this._httpClient.post<T>(url, body, { params: queryParams });
                break;
            case "PUT":
                request = this._httpClient.put<T>(url, body, { params: queryParams });
                break;
            case "PATCH":
                request = this._httpClient.patch<T>(url, body, { params: queryParams });
                break;
            case "DELETE":
                request = this._httpClient.delete(url, { params: queryParams });
                break;

            default:
                throw new Error("Method not supported");
        }
        return new Observable<T>((subscriber) => {
            request.then((response) => {
                subscriber.next(response.data);
                subscriber.complete();
            }).catch((err: Error) => {
                subscriber.error(err);
                subscriber.complete();
            });
        });
    }

    public get<T>(url: string, queryParams?: object) {
        return this._makeRequest<T>("GET", url, queryParams);
    }

    public post<T>(url: string, body: object, queryParams?: object) {
        return this._makeRequest<T>("POST", url, queryParams, body);
    }

    public put<T>(url: string, body: object, queryParams?: object) {
        return this._makeRequest<T>("PUT", url, queryParams, body);
    }

    public patch<T>(url: string, body: object, queryParams?: object) {
        return this._makeRequest<T>("PATCH", url, queryParams, body);
    }

    public delete(url: string, queryParams?: object) {
        return this._makeRequest("DELETE", url, queryParams);
    }
}
