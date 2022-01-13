/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TrapiClientRequestConfig } from '../type';
import {TrapiClient} from '../module';

export interface Type extends Function {
    new (config?: TrapiClientConfig) : TrapiClient;
}

export type TrapiClientConfig = {
    clazz?: Type,
    driver?: TrapiClientRequestConfig,
    connectionString?: string,
    extra?: Record<string, any>
};
