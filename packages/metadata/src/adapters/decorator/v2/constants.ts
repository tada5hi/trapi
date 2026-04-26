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

export type ParamKindValue = `${typeof ParamKind[keyof typeof ParamKind]}`;

export const CollectionKind = {
    Csv: 'csv',
    Ssv: 'ssv',
    Tsv: 'tsv',
    Pipes: 'pipes',
    Multi: 'multi',
} as const;

export type CollectionKindValue = `${typeof CollectionKind[keyof typeof CollectionKind]}`;

export const DecoratorTargetKind = {
    Class: 'class',
    Method: 'method',
    Parameter: 'parameter',
    Property: 'property',
} as const;

export type DecoratorTargetValue = `${typeof DecoratorTargetKind[keyof typeof DecoratorTargetKind]}`;

export const DecoratorArgumentKindName = {
    Literal: 'literal',
    Object: 'object',
    Array: 'array',
    Identifier: 'identifier',
    Unresolvable: 'unresolvable',
} as const;

export type DecoratorArgumentKindValue = `${typeof DecoratorArgumentKindName[keyof typeof DecoratorArgumentKindName]}`;

export const MarkerName = {
    Hidden: 'hidden',
    Deprecated: 'deprecated',
    Extension: 'extension',
} as const;

export type MarkerNameValue = `${typeof MarkerName[keyof typeof MarkerName]}`;

export const NumericKind = {
    Int: 'int',
    Long: 'long',
    Float: 'float',
    Double: 'double',
} as const;

export type NumericKindValue = `${typeof NumericKind[keyof typeof NumericKind]}`;
