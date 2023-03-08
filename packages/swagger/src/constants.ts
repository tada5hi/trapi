/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum Version {
    V2 = 'V2',
    V3 = 'V3',
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
