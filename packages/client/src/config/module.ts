/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Config } from './type';

const configMap: Record<string, Config> = {};

export function setConfig(
    value?: Config,
    key?: string,
) : Config {
    key = key || 'default';
    value = buildConfig(value);

    configMap[key] = value;

    return value;
}

export function useConfig(
    key?: string,
): Config {
    key = key || 'default';

    const data: Config | undefined = configMap[key];

    if (typeof data === 'undefined') {
        return buildConfig();
    }

    return data;
}

export function buildConfig(
    config?: Config,
) : Config {
    config ??= {};
    config.extra ??= {};

    return config;
}
