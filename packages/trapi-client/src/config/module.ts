/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TrapiClientConfig } from './type';

const configMap: Map<string, TrapiClientConfig> = new Map<string, TrapiClientConfig>();

export function setTrapiClientConfig(
    key: string = 'default',
    value: TrapiClientConfig,
) {
    configMap.set(key, value);

    return value;
}

export function useTrapiClientConfig<T extends TrapiClientConfig>(
    key: string = 'default',
): T | undefined {
    const data: TrapiClientConfig | undefined = configMap.get(key);
    if (typeof data === 'undefined') {
        return undefined;
    }

    return data as T;
}
