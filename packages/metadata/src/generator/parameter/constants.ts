/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ParameterSource {
    BODY = 'body',
    CONTEXT = 'context',
    COOKIE = 'cookie',
    HEADER = 'header',
    FORM_DATA = 'formData',
    QUERY = 'query',
    PARAM = 'param',
    PATH = 'path',
}

export enum CollectionFormat {
    CSV = 'csv',
    SSV = 'ssv',
    TSV = 'tsv',
    PIPES = 'pipes',
    MULTI = 'multi',
}
