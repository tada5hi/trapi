/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const ParamKind = {
    Body: 'body',
    BodyProp: 'bodyProp',
    Context: 'context',
    Cookie: 'cookie',
    Header: 'header',
    FormData: 'formData',
    Query: 'query',
    QueryProp: 'queryProp',
    Path: 'path',
} as const;

export type ParamKindValue = typeof ParamKind[keyof typeof ParamKind];

export const CollectionKind = {
    Csv: 'csv',
    Ssv: 'ssv',
    Tsv: 'tsv',
    Pipes: 'pipes',
    Multi: 'multi',
} as const;

export type CollectionKindValue = typeof CollectionKind[keyof typeof CollectionKind];
