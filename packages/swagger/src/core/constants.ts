/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const Version = {
    V2: 'v2',
    V3: 'v3',
    V3_1: 'v3.1',
    V3_2: 'v3.2',
} as const;
export type Version = typeof Version[keyof typeof Version];

export const DocumentFormat = {
    YAML: 'yaml',
    JSON: 'json',
} as const;
export type DocumentFormat = typeof DocumentFormat[keyof typeof DocumentFormat];

export const SecurityType = {
    API_KEY: 'apiKey',
    BASIC: 'basic', // v2 only
    HTTP: 'http',
    OAUTH2: 'oauth2',
} as const;
export type SecurityType = typeof SecurityType[keyof typeof SecurityType];
