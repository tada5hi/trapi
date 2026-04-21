/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum Version {
    V2 = 'v2',
    V3 = 'v3',
    V3_1 = 'v3.1',
    V3_2 = 'v3.2',
}

export enum DocumentFormat {
    YAML = 'yaml',
    JSON = 'json',
}

export enum SecurityType {
    API_KEY = 'apiKey',
    BASIC = 'basic', // v2 only
    HTTP = 'http',
    OAUTH2 = 'oauth2',
}
