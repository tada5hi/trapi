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
import {TrapiClientConfig} from "./config";

export class TrapiClient {
    public readonly driver: AxiosInstance;

    /**
     * API Service
     *
     * @param config
     */
    constructor(config: TrapiClientConfig) {
        this.driver = axios.create(config.driver);
    }

    // ---------------------------------------------------------------------------------

    get config() : AxiosDefaults<any> {
        return this.driver.defaults;
    }

    public getUri(config?: TrapiClientRequestConfig): string {
        return this.driver.getUri(config);
    }

    // ---------------------------------------------------------------------------------

    public setHeader(key: string, value: string) {
        this.driver.defaults.headers.common[key] = value;
    }

    public unsetHeader(key: string) {
        if (key in this.driver.defaults.headers.common) {
            delete this.driver.defaults.headers.common[key];
        }
    }

    public resetHeader() {
        this.driver.defaults.headers.common = {};
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
        return this.driver.request(config);
    }

    // ---------------------------------------------------------------------------------

    public get<T, R = TrapiClientResponse<T>>(url: string, config?: TrapiClientRequestConfig): Promise<R> {
        return this.driver.get(url, config);
    }

    // ---------------------------------------------------------------------------------

    public delete<T, R = TrapiClientResponse<T>>(url: string, config?: TrapiClientRequestConfig): Promise<R> {
        return this.driver.delete(url, config);
    }

    // ---------------------------------------------------------------------------------

    public head<T, R = TrapiClientResponse<T>>(url: string, config?: TrapiClientRequestConfig): Promise<R> {
        return this.driver.head(url, config);
    }

    // ---------------------------------------------------------------------------------

    public post<T, R = TrapiClientResponse<T>>(url: string, data?: any, config?: TrapiClientRequestConfig): Promise<R> {
        return this.driver.post(url, data, config);
    }

    // ---------------------------------------------------------------------------------

    public put<T, R = TrapiClientResponse<T>>(url: string, data?: any, config?: TrapiClientRequestConfig): Promise<R> {
        return this.driver.put(url, data, config);
    }

    // ---------------------------------------------------------------------------------

    public patch<T, R = TrapiClientResponse<T>>(url: string, data?: any, config?: TrapiClientRequestConfig): Promise<R> {
        return this.driver.patch(url, data, config);
    }

    //---------------------------------------------------------------------------------

    public mountResponseInterceptor(
        onFulfilled: (value: TrapiClientResponse<any>) => any | Promise<TrapiClientResponse<any>>,
        onRejected: (error: any) => any,
    ) : number {
        return this.driver.interceptors.response.use(onFulfilled, onRejected);
    }

    public unmountResponseInterceptor(id: number) {
        this.driver.interceptors.response.eject(id);
    }

    //---------------------------------------------------------------------------------

    public mountRequestInterceptor(
        onFulfilled: (value: TrapiClientRequestConfig) => any | Promise<TrapiClientRequestConfig>,
        onRejected: (error: any) => any,
    ) : number {
        return this.driver.interceptors.request.use(onFulfilled, onRejected);
    }

    public unmountRequestInterceptor(id: number) {
        this.driver.interceptors.request.eject(id);
    }
}
