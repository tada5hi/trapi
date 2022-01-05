/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AuthorizationHeader,
    stringifyAuthorizationHeader,
} from '@typescript-auth/core';
import axios, { AxiosDefaults, AxiosInstance } from 'axios';
import { TrapiClientRequestConfig, TrapiClientResponse } from './type';

export class TrapiClient {
    protected api: AxiosInstance;

    /**
     * API Service
     *
     * @param config
     */
    constructor(config: TrapiClientRequestConfig) {
        this.api = axios.create(config);
    }

    // ---------------------------------------------------------------------------------

    get config() : AxiosDefaults<any> {
        return this.api.defaults;
    }

    public getUri(config?: TrapiClientRequestConfig): string {
        return this.api.getUri(config);
    }

    // ---------------------------------------------------------------------------------

    public setHeader(key: string, value: string) {
        this.api.defaults.headers.common[key] = value;
    }

    public unsetHeader(key: string) {
        if (key in this.api.defaults.headers.common) {
            delete this.api.defaults.headers.common[key];
        }
    }

    public resetHeader() {
        this.api.defaults.headers.common = {};
    }

    // ---------------------------------------------------------------------------------

    public setAuthorizationHeader(options: AuthorizationHeader) {
        this.setHeader('Authorization', stringifyAuthorizationHeader(options));
    }

    public unsetAuthorizationHeader() {
        this.unsetHeader('Authorization');
    }

    // ---------------------------------------------------------------------------------

    public request<T, R = TrapiClientResponse<T>>(config: TrapiClientRequestConfig): Promise<R> {
        return this.api.request(config);
    }

    // ---------------------------------------------------------------------------------

    public get<T, R = TrapiClientResponse<T>>(url: string, config?: TrapiClientRequestConfig): Promise<R> {
        return this.api.get(url, config);
    }

    // ---------------------------------------------------------------------------------

    public delete<T, R = TrapiClientResponse<T>>(url: string, config?: TrapiClientRequestConfig): Promise<R> {
        return this.api.delete(url, config);
    }

    // ---------------------------------------------------------------------------------

    public head<T, R = TrapiClientResponse<T>>(url: string, config?: TrapiClientRequestConfig): Promise<R> {
        return this.api.head(url, config);
    }

    // ---------------------------------------------------------------------------------

    public post<T, R = TrapiClientResponse<T>>(url: string, data?: any, config?: TrapiClientRequestConfig): Promise<R> {
        return this.api.post(url, data, config);
    }

    // ---------------------------------------------------------------------------------

    public put<T, R = TrapiClientResponse<T>>(url: string, data?: any, config?: TrapiClientRequestConfig): Promise<R> {
        return this.api.put(url, data, config);
    }

    // ---------------------------------------------------------------------------------

    public patch<T, R = TrapiClientResponse<T>>(url: string, data?: any, config?: TrapiClientRequestConfig): Promise<R> {
        return this.api.patch(url, data, config);
    }

    //---------------------------------------------------------------------------------

    public mountResponseInterceptor(
        onFulfilled: (value: TrapiClientResponse<any>) => any | Promise<TrapiClientResponse<any>>,
        onRejected: (error: any) => any,
    ) : number {
        return this.api.interceptors.response.use(onFulfilled, onRejected);
    }

    public unmountResponseInterceptor(id: number) {
        this.api.interceptors.response.eject(id);
    }

    //---------------------------------------------------------------------------------

    public mountRequestInterceptor(
        onFulfilled: (value: TrapiClientRequestConfig) => any | Promise<TrapiClientRequestConfig>,
        onRejected: (error: any) => any,
    ) : number {
        return this.api.interceptors.request.use(onFulfilled, onRejected);
    }

    public unmountRequestInterceptor(id: number) {
        this.api.interceptors.request.eject(id);
    }
}
