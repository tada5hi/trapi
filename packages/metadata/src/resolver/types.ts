/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Validator } from '../utils';
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
        RefEnumType |
        RefObjectType |
        RefAliasType |
        NestedObjectLiteralType |
        UnionType |
        IntersectionType |
        VoidType;

// -------------------------------------------

export interface BaseType {
    typeName: `${TypeName}`;
}

// -------------------------------------------
// Primitive Type(s)
// -------------------------------------------

export interface AnyType extends BaseType {
    typeName: `${TypeName.ANY}`;
}

export interface UndefinedType extends BaseType {
    typeName: `${TypeName.UNDEFINED}`;
}

export interface StringType extends BaseType {
    typeName: `${TypeName.STRING}`;
}

export interface BooleanType extends BaseType {
    typeName: `${TypeName.BOOLEAN}`;
}

export interface BigintType extends BaseType {
    typeName: `${TypeName.BIGINT}`;
}

export interface DoubleType extends BaseType {
    typeName: `${TypeName.DOUBLE}`;
}

export interface FloatType extends BaseType {
    typeName: `${TypeName.FLOAT}`;
}

export interface IntegerType extends BaseType {
    typeName: `${TypeName.INTEGER}`;
}

export interface LongType extends BaseType {
    typeName: `${TypeName.LONG}`;
}

export interface VoidType extends BaseType {
    typeName: `${TypeName.VOID}`;
}

// -------------------------------------------
// Simple Type(s)
// -------------------------------------------

export interface DateType extends BaseType {
    typeName: `${TypeName.DATE}`;
}

export interface FileType extends BaseType {
    typeName: `${TypeName.FILE}`;
}

export interface DateTimeType extends BaseType {
    typeName: `${TypeName.DATETIME}`;
}

export interface BinaryType extends BaseType {
    typeName: `${TypeName.BINARY}`;
}

export interface BufferType extends BaseType {
    typeName: `${TypeName.BUFFER}`;
}

export interface ByteType extends BaseType {
    typeName: `${TypeName.BYTE}`;
}

export interface ObjectType extends BaseType {
    typeName: `${TypeName.OBJECT}`;
}

// -------------------------------------------
// Complex Type(s)
// -------------------------------------------

export interface EnumType extends BaseType {
    members: Array<string | number | boolean | null>;
    typeName: `${TypeName.ENUM}`;
}

export interface ArrayType extends BaseType {
    elementType: Type;
    typeName: `${TypeName.ARRAY}`;
}

export interface NestedObjectLiteralType extends BaseType {
    typeName: `${TypeName.NESTED_OBJECT_LITERAL}`;
    properties: ResolverProperty[];
    additionalProperties?: Type;
}

export interface IntersectionType extends BaseType {
    typeName: `${TypeName.INTERSECTION}`;
    members: Type[];
}

export interface UnionType extends BaseType {
    typeName: `${TypeName.UNION}`;
    members: Type[];
}

// -------------------------------------------
// Reference Type(s)
// -------------------------------------------

export type ReferenceType = RefEnumType | RefObjectType | RefAliasType;
export type ReferenceTypes = Record<string, ReferenceType>;

export type DependencyResolver = (referenceTypes: ReferenceTypes) => void;

export interface ReferenceTypeBase extends BaseType {
    description?: string;
    typeName: `${TypeName.REF_ALIAS}` | `${TypeName.REF_ENUM}` | `${TypeName.REF_OBJECT}`;
    refName: string;
    example?: unknown;
    deprecated: boolean;
}

export interface RefEnumType extends ReferenceTypeBase {
    typeName: `${TypeName.REF_ENUM}`;
    members: Array<string | number | boolean>;
    memberNames?: string[];
}

export interface RefObjectType extends ReferenceTypeBase {
    typeName: `${TypeName.REF_OBJECT}`;
    properties: ResolverProperty[];
    additionalProperties?: Type;
}

export interface RefAliasType extends Omit<ResolverProperty, 'name' | 'required'>, ReferenceTypeBase {
    typeName: `${TypeName.REF_ALIAS}`;
}

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

export interface ResolverProperty {
    default?: any;
    format?: string;
    example?: unknown;
    validators?: Record<string, Validator>;
    description?: string;
    name: string;
    type: Type;
    required: boolean;
    deprecated: boolean;
    extensions?: Extension[]
}

/**
 * Cache interface for the resolver's type cache.
 */
export interface IResolverCache {
    getCachedType(name: string): ReferenceType | undefined;
    setCachedType(name: string, type: ReferenceType): void;
    isInProgress(name: string): boolean;
    markInProgress(name: string): void;
    clear(): void;
}

export type UtilityTypeOptions = {
    keys: Array<string | number | boolean | null>;
};
