/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ClientConfig } from './type';

const configMap: Record<string, ClientConfig> = {};

export function setClientConfig(
    key: string = 'default',
    value?: ClientConfig,
) : ClientConfig {
    value = buildClientConfig(value);

    configMap[key] = value;

    return value;
}

export function useClientConfig(
    key: string = 'default',
): ClientConfig {
    const data: ClientConfig | undefined = configMap[key];

    if (typeof data === 'undefined') {
        return buildClientConfig();
    }

    return data;
}

export function buildClientConfig(
    config?: ClientConfig
) : ClientConfig {
    config ??= {};
    config.extra ??= {};

    return config;
}
