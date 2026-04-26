/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const ParameterSourceV3 = {
    COOKIE: 'cookie',
    HEADER: 'header',
    PATH: 'path',
    QUERY: 'query',
} as const;
export type ParameterSourceV3 = typeof ParameterSourceV3[keyof typeof ParameterSourceV3];
