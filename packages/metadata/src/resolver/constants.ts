/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum TypeName {
    STRING = 'string',
    BOOLEAN = 'boolean',
    BIGINT = 'bigint',
    DOUBLE = 'double',
    FLOAT = 'float',
    FILE = 'file',
    INTEGER = 'integer',
    LONG = 'long',
    ENUM = 'enum',
    ARRAY = 'array',
    DATETIME = 'datetime',
    DATE = 'date',
    BINARY = 'binary',
    BUFFER = 'buffer',
    BYTE = 'byte',
    VOID = 'void',
    OBJECT = 'object',
    ANY = 'any',
    UNDEFINED = 'undefined',
    REF_ENUM = 'refEnum',
    REF_OBJECT = 'refObject',
    REF_ALIAS = 'refAlias',
    NESTED_OBJECT_LITERAL = 'nestedObjectLiteral',
    UNION = 'union',
    INTERSECTION = 'intersection',
    TUPLE = 'tuple',
}

export enum UtilityTypeName {
    NON_NULLABLE = 'NonNullable',
    OMIT = 'Omit',
    PARTIAL = 'Partial',
    READONLY = 'Readonly',
    RECORD = 'Record',
    REQUIRED = 'Required',
    PICK = 'Pick',
    // Checker-resolvable utility types — delegated to the TS type checker
    EXTRACT = 'Extract',
    EXCLUDE = 'Exclude',
    RETURN_TYPE = 'ReturnType',
    PARAMETERS = 'Parameters',
    AWAITED = 'Awaited',
    INSTANCE_TYPE = 'InstanceType',
    CONSTRUCTOR_PARAMETERS = 'ConstructorParameters',
}
