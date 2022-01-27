/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    buildConfig,
    Config,
    useConfig,
} from './config';
import { Client } from './module';

const instanceMap: Record<string, Client> = {};

export function setClient<T extends Client>(
    client: T,
    key?: string,
) : T {
    key = key || 'default';

    instanceMap[key] = client;

    return client;
}

export function useClient<T extends Client>(
    key?: string,
) : T {
    key = key || 'default';

    const config = useConfig(key);

    if (Object.prototype.hasOwnProperty.call(instanceMap, key)) {
        return instanceMap[key] as T;
    }

    const instance = createClient(config);

    instanceMap[key] = instance;

    return instance as T;
}

export function createClient<T extends Client = Client>(
    config?: Config
) : T {
    config = buildConfig(config);

    let instance : T;

    if(config.clazz) {
        instance = new config.clazz(config);
    } else {
        instance = new Client(config) as T;
    }

    return instance;
}
