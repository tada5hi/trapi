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
// eslint-disable-next-line @tada5hi/type-declaration-location -- Preserve the merged public contract.
export type ParamKind = typeof ParamKind[keyof typeof ParamKind];

export const CollectionKind = {
    Csv: 'csv',
    Ssv: 'ssv',
    Tsv: 'tsv',
    Pipes: 'pipes',
    Multi: 'multi',
} as const;
// eslint-disable-next-line @tada5hi/type-declaration-location -- Preserve the merged public contract.
export type CollectionKind = typeof CollectionKind[keyof typeof CollectionKind];

export const DecoratorTargetKind = {
    Class: 'class',
    Method: 'method',
    Parameter: 'parameter',
    Property: 'property',
} as const;
// eslint-disable-next-line @tada5hi/type-declaration-location -- Preserve the merged public contract.
export type DecoratorTargetKind = typeof DecoratorTargetKind[keyof typeof DecoratorTargetKind];

export const DecoratorArgumentKindName = {
    Literal: 'literal',
    Object: 'object',
    Array: 'array',
    Identifier: 'identifier',
    Unresolvable: 'unresolvable',
} as const;
// eslint-disable-next-line @tada5hi/type-declaration-location -- Preserve the merged public contract.
export type DecoratorArgumentKindName = typeof DecoratorArgumentKindName[keyof typeof DecoratorArgumentKindName];

export const MarkerName = {
    Hidden: 'hidden',
    Deprecated: 'deprecated',
    Extension: 'extension',
} as const;
// eslint-disable-next-line @tada5hi/type-declaration-location -- Preserve the merged public contract.
export type MarkerName = typeof MarkerName[keyof typeof MarkerName];

export const NumericKind = {
    Int: 'int',
    Long: 'long',
    Float: 'float',
    Double: 'double',
} as const;
// eslint-disable-next-line @tada5hi/type-declaration-location -- Preserve the merged public contract.
export type NumericKind = typeof NumericKind[keyof typeof NumericKind];
