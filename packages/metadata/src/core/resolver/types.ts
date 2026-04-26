/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Validator } from '../validator/types';
import type { TypeName } from './constants';
import type { Extension } from './extension';

export type Type = PrimitiveType |
        ObjectType |
        EnumType |
        ArrayType |
        FileType |
        DateTimeType |
        DateType |
        BinaryType |
        BufferType |
        ByteType |
        AnyType |
        UndefinedType |
        NeverType |
        RefEnumType |
        RefObjectType |
        RefAliasType |
        NestedObjectLiteralType |
        UnionType |
        IntersectionType |
        TupleType |
        VoidType;

// -------------------------------------------

export type BaseType = {
    typeName: `${TypeName}`;
};

// -------------------------------------------
// Primitive Type(s)
// -------------------------------------------

export type AnyType = BaseType & {
    typeName: `${TypeName.ANY}`;
};

export type UndefinedType = BaseType & {
    typeName: `${TypeName.UNDEFINED}`;
};

export type StringType = BaseType & {
    typeName: `${TypeName.STRING}`;
};

export type BooleanType = BaseType & {
    typeName: `${TypeName.BOOLEAN}`;
};

export type BigintType = BaseType & {
    typeName: `${TypeName.BIGINT}`;
};

export type DoubleType = BaseType & {
    typeName: `${TypeName.DOUBLE}`;
};

export type FloatType = BaseType & {
    typeName: `${TypeName.FLOAT}`;
};

export type IntegerType = BaseType & {
    typeName: `${TypeName.INTEGER}`;
};

export type LongType = BaseType & {
    typeName: `${TypeName.LONG}`;
};

export type VoidType = BaseType & {
    typeName: `${TypeName.VOID}`;
};

export type NeverType = BaseType & {
    typeName: `${TypeName.NEVER}`;
};

// -------------------------------------------
// Simple Type(s)
// -------------------------------------------

export type DateType = BaseType & {
    typeName: `${TypeName.DATE}`;
};

export type FileType = BaseType & {
    typeName: `${TypeName.FILE}`;
};

export type DateTimeType = BaseType & {
    typeName: `${TypeName.DATETIME}`;
};

export type BinaryType = BaseType & {
    typeName: `${TypeName.BINARY}`;
};

export type BufferType = BaseType & {
    typeName: `${TypeName.BUFFER}`;
};

export type ByteType = BaseType & {
    typeName: `${TypeName.BYTE}`;
};

export type ObjectType = BaseType & {
    typeName: `${TypeName.OBJECT}`;
};

// -------------------------------------------
// Complex Type(s)
// -------------------------------------------

export type EnumType = BaseType & {
    members: Array<string | number | boolean | null>;
    typeName: `${TypeName.ENUM}`;
};

export type ArrayType = BaseType & {
    elementType: Type;
    typeName: `${TypeName.ARRAY}`;
};

export type NestedObjectLiteralType = BaseType & {
    typeName: `${TypeName.NESTED_OBJECT_LITERAL}`;
    properties: ResolverProperty[];
    additionalProperties?: Type;
};

export type IntersectionType = BaseType & {
    typeName: `${TypeName.INTERSECTION}`;
    members: Type[];
};

export type UnionType = BaseType & {
    typeName: `${TypeName.UNION}`;
    members: Type[];
};

export type TupleElement = {
    type: Type;
    name?: string;
};

export type TupleType = BaseType & {
    typeName: `${TypeName.TUPLE}`;
    elements: TupleElement[];
};

// -------------------------------------------
// Reference Type(s)
// -------------------------------------------

export type ReferenceType = RefEnumType | RefObjectType | RefAliasType;
export type ReferenceTypes = Record<string, ReferenceType>;

export type DependencyResolver = (referenceTypes: ReferenceTypes) => void;

export type ReferenceTypeBase = BaseType & {
    description?: string;
    typeName: `${TypeName.REF_ALIAS}` | `${TypeName.REF_ENUM}` | `${TypeName.REF_OBJECT}`;
    refName: string;
    example?: unknown;
    deprecated: boolean;
};

export type RefEnumType = ReferenceTypeBase & {
    typeName: `${TypeName.REF_ENUM}`;
    members: Array<string | number | boolean>;
    memberNames?: string[];
};

export type RefObjectType = ReferenceTypeBase & {
    typeName: `${TypeName.REF_OBJECT}`;
    properties: ResolverProperty[];
    additionalProperties?: Type;
};

export type RefAliasType = Omit<ResolverProperty, 'name' | 'required'> & ReferenceTypeBase & {
    typeName: `${TypeName.REF_ALIAS}`;
};

export type PrimitiveType = AnyType |
BinaryType |
BooleanType |
BufferType |
ByteType |
DateType |
DateTimeType |
DoubleType |
FloatType |
FileType |
BigintType |
IntegerType |
LongType |
ObjectType |
StringType |
UndefinedType;

export type ResolverProperty = {
    default?: any;
    format?: string;
    example?: unknown;
    validators?: Record<string, Validator>;
    description?: string;
    name: string;
    type: Type;
    required: boolean;
    deprecated: boolean;
    extensions?: Extension[];
};

/**
 * Cache interface for the resolver's type cache.
 */
export interface IResolverCache {
    getCachedType(name: string): ReferenceType | undefined;
    setCachedType(name: string, type: ReferenceType): void;
    isInProgress(name: string): boolean;
    markInProgress(name: string): void;
    clearInProgress(name: string): void;
    clear(): void;
}

// -------------------------------------------
