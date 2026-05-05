/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const ParameterSource = {
    BODY: 'body',
    BODY_PROP: 'bodyProp',
    CONTEXT: 'context',
    COOKIE: 'cookie',
    HEADER: 'header',
    FORM_DATA: 'formData',
    QUERY: 'query',
    QUERY_PROP: 'queryProp',
    PATH: 'path',
} as const;
export type ParameterSource = typeof ParameterSource[keyof typeof ParameterSource];

export const CollectionFormat = {
    CSV: 'csv',
    SSV: 'ssv',
    TSV: 'tsv',
    PIPES: 'pipes',
    MULTI: 'multi',
} as const;
export type CollectionFormat = typeof CollectionFormat[keyof typeof CollectionFormat];
