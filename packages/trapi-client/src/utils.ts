/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    useClientConfig,
} from './config';
import { Client } from './module';

const instanceMap: Record<string, Client> = {};

export function setClient<T extends Client>(
    key: string = 'default',
    client: T
) : T {
    instanceMap[key] = client;

    return client;
}

export function useClient<T extends Client>(
    key: string = 'default',
) : T {
    const config = useClientConfig(key);

    if (Object.prototype.hasOwnProperty.call(instanceMap, key)) {
        return instanceMap[key] as T;
    }

    let instance : Client;

    if(
        config &&
        config.clazz
    ) {
        instance = new config.clazz(config);
    } else {
        instance = new Client(config);
    }

    instanceMap[key] = instance;

    return instance as T;
}
