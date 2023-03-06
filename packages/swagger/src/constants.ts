/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum SpecificationVersion {
    V2 = 'V2',
    V3 = 'V3',
}

export enum SpecificationParameterSource {
    BODY = 'body',
    FORM_DATA = 'formData',
    HEADER = 'header',
    PATH = 'path',
    QUERY = 'query',
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
