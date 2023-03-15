/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Validator } from '../utils';
import { TypeName } from './constants';
import type { Extension } from './extension';

export type Type =
        | PrimitiveType
        | ObjectType
        | EnumType
        | ArrayType
        | FileType
        | DateTimeType
        | DateType
        | BinaryType
        | BufferType
        | ByteType
        | AnyType
        | RefEnumType
        | RefObjectType
        | RefAliasType
        | NestedObjectLiteralType
        | UnionType
        | IntersectionType
        | VoidType;

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

export function isAnyType(param: BaseType): param is AnyType {
    return param.typeName === TypeName.ANY;
}

export interface StringType extends BaseType {
    typeName: `${TypeName.STRING}`;
}

export function isStringType(param: BaseType): param is StringType {
    return param.typeName === TypeName.STRING;
}

export interface BooleanType extends BaseType {
    typeName: `${TypeName.BOOLEAN}`;
}

export function isBooleanType(param: BaseType): param is BooleanType {
    return param.typeName === TypeName.BOOLEAN;
}

export interface DoubleType extends BaseType {
    typeName: `${TypeName.DOUBLE}`;
}

export function isDoubleType(param: BaseType): param is DoubleType {
    return param.typeName === TypeName.DOUBLE;
}

export interface FloatType extends BaseType {
    typeName: `${TypeName.FLOAT}`;
}

export function isFloatType(param: BaseType): param is FloatType {
    return param.typeName === TypeName.FLOAT;
}

export interface IntegerType extends BaseType {
    typeName: `${TypeName.INTEGER}`;
}

export function isIntegerType(param: BaseType): param is IntegerType {
    return param.typeName === TypeName.INTEGER;
}

export interface LongType extends BaseType {
    typeName: `${TypeName.LONG}`;
}

export function isLongType(param: BaseType): param is LongType {
    return param.typeName === TypeName.LONG;
}

export interface VoidType extends BaseType {
    typeName: `${TypeName.VOID}`;
}

export function isVoidType(param: BaseType) : param is VoidType {
    return typeof param === 'undefined' || param.typeName === TypeName.VOID;
}

// -------------------------------------------
// Simple Type(s)
// -------------------------------------------

export interface DateType extends BaseType {
    typeName: `${TypeName.DATE}`;
}

export function isDateType(param: BaseType): param is DateType {
    return param.typeName === TypeName.DATE;
}

export interface FileType extends BaseType {
    typeName: `${TypeName.FILE}`;
}

export function isFileType(param: BaseType): param is FileType {
    return param.typeName === TypeName.FILE;
}

export interface DateTimeType extends BaseType {
    typeName: `${TypeName.DATETIME}`;
}

export function isDateTimeType(param: BaseType): param is DateTimeType {
    return param.typeName === TypeName.DATETIME;
}

export interface BinaryType extends BaseType {
    typeName: `${TypeName.BINARY}`;
}

export function isBinaryType(param: BaseType): param is BinaryType {
    return param.typeName === TypeName.BINARY;
}

export interface BufferType extends BaseType {
    typeName: `${TypeName.BUFFER}`;
}

export function isBufferType(param: BaseType): param is BufferType {
    return param.typeName === TypeName.BUFFER;
}

export interface ByteType extends BaseType {
    typeName: `${TypeName.BYTE}`;
}
export function isByteType(param: BaseType): param is ByteType {
    return param.typeName === TypeName.BYTE;
}

export interface ObjectType extends BaseType {
    typeName: `${TypeName.OBJECT}`;
}

export function isObjectType(param: BaseType): param is ObjectType {
    return param.typeName === TypeName.OBJECT;
}

// -------------------------------------------
// Complex Type(s)
// -------------------------------------------

export interface EnumType extends BaseType {
    members: Array<string | number | boolean | null>;
    typeName: `${TypeName.ENUM}`;
}

export function isEnumType(param: BaseType) : param is EnumType {
    return param.typeName === TypeName.ENUM;
}

// -------------------------------------------

export interface ArrayType extends BaseType {
    elementType: Type;
    typeName: `${TypeName.ARRAY}`;
}

export function isArrayType(param: BaseType) : param is ArrayType {
    return param.typeName === TypeName.ARRAY;
}

// -------------------------------------------

export interface NestedObjectLiteralType extends BaseType {
    typeName: `${TypeName.NESTED_OBJECT_LITERAL}`;
    properties: ResolverProperty[];
    additionalProperties?: Type;
}

export function isNestedObjectLiteralType(param: BaseType) : param is NestedObjectLiteralType {
    return param.typeName === TypeName.NESTED_OBJECT_LITERAL;
}

// -------------------------------------------

export interface IntersectionType extends BaseType {
    typeName: `${TypeName.INTERSECTION}`;
    members: Type[];
}

export function isIntersectionType(param: BaseType) : param is IntersectionType {
    return param.typeName === TypeName.INTERSECTION;
}

// -------------------------------------------

export interface UnionType extends BaseType {
    typeName: `${TypeName.UNION}`;
    members: Type[];
}

export function isUnionType(param: BaseType) : param is UnionType {
    return param.typeName === TypeName.UNION;
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

export function isRefEnumType(param: BaseType) : param is RefEnumType {
    return param.typeName === TypeName.REF_ENUM;
}

export interface RefObjectType extends ReferenceTypeBase {
    typeName: `${TypeName.REF_OBJECT}`;
    properties: ResolverProperty[];
    additionalProperties?: Type;
}

export function isRefObjectType(param: BaseType) : param is RefObjectType {
    return param.typeName === TypeName.REF_OBJECT;
}

export interface RefAliasType extends Omit<ResolverProperty, 'name' | 'required'>, ReferenceTypeBase {
    typeName: `${TypeName.REF_ALIAS}`;
}

export function isRefAliasType(param: BaseType) : param is RefAliasType {
    return param.typeName === TypeName.REF_ALIAS;
}

export function isReferenceType(param: BaseType) : param is ReferenceType {
    return param.typeName === TypeName.REF_ALIAS ||
        param.typeName === TypeName.REF_ENUM ||
        param.typeName === TypeName.REF_OBJECT;
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
IntegerType |
LongType |
ObjectType |
StringType;
export function isPrimitiveType(type: BaseType) : type is PrimitiveType {
    return isAnyType(type) ||
        isBinaryType(type) ||
        isBooleanType(type) ||
        isBufferType(type) ||
        isByteType(type) ||
        isDateType(type) ||
        isDateTimeType(type) ||
        isDoubleType(type) ||
        isFloatType(type) ||
        isFileType(type) ||
        isIntegerType(type) ||
        isLongType(type) ||
        isObjectType(type) ||
        isStringType(type);
}

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
