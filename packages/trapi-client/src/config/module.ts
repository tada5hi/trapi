/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientConfig } from './type';

const configMap: Map<string, ClientConfig> = new Map<string, ClientConfig>();

export function setClientConfig(
    key: string = 'default',
    value: ClientConfig,
) {
    configMap.set(key, value);

    return value;
}

export function useClientConfig<T extends ClientConfig>(
    key: string = 'default',
): T | undefined {
    const data: ClientConfig | undefined = configMap.get(key);
    if (typeof data === 'undefined') {
        return undefined;
    }

    return data as T;
}
