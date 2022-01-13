/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    TrapiClientConfig,
    useTrapiClientConfig,
} from './config';
import { TrapiClient } from './module';

const instanceMap: Record<string, TrapiClient> = {};

export function setTrapiClient<T extends TrapiClient>(
    key: string = 'default',
    client: T
) : T {
    instanceMap[key] = client;

    return client;
}

export function useTrapiClient<T extends TrapiClient>(
    key: string = 'default',
) : T {
    const config : TrapiClientConfig = useTrapiClientConfig(key);

    if (Object.prototype.hasOwnProperty.call(instanceMap, key)) {
        return instanceMap[key] as T;
    }

    let instance : TrapiClient;

    if(config.clazz) {
        instance = new config.clazz(config.driver);
    } else {
        instance = new TrapiClient(config.driver);
    }

    instanceMap[key] = instance;

    return instance as T;
}
