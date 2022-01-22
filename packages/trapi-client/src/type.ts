/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ClientRequestConfig extends AxiosRequestConfig {
    token?: string | null,
    alias?: string
}

export interface ClientResponse<T = any> extends AxiosResponse {

}
