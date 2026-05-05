/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TypeName } from './constants';
import type {
    AnyType,
    ArrayType,
    BaseType,
    BigintType,
    BinaryType,
    BooleanType,
    BufferType,
    ByteType,
    DateTimeType,
    DateType,
    DoubleType,
    EnumType,
    FileType,
    FloatType,
    IntegerType,
    IntersectionType,
    LongType,
    NestedObjectLiteralType,
    NeverType,
    ObjectType,
    PrimitiveType,
    RefAliasType,
    RefEnumType,
    RefObjectType,
    ReferenceType,
    StringType,
    TupleType,
    UndefinedType,
    UnionType,
    VoidType,
} from './types';

// -------------------------------------------
// Primitive Type Guards
// -------------------------------------------

export function isAnyType(param: BaseType): param is AnyType {
    return param.typeName === TypeName.ANY;
}

export function isUndefinedType(param: BaseType): param is UndefinedType {
    return param.typeName === TypeName.UNDEFINED;
}

export function isStringType(param: BaseType): param is StringType {
    return param.typeName === TypeName.STRING;
}

export function isBooleanType(param: BaseType): param is BooleanType {
    return param.typeName === TypeName.BOOLEAN;
}

export function isBigintType(param: BaseType): param is BigintType {
    return param.typeName === TypeName.BIGINT;
}

export function isDoubleType(param: BaseType): param is DoubleType {
    return param.typeName === TypeName.DOUBLE;
}

export function isFloatType(param: BaseType): param is FloatType {
    return param.typeName === TypeName.FLOAT;
}

export function isIntegerType(param: BaseType): param is IntegerType {
    return param.typeName === TypeName.INTEGER;
}

export function isLongType(param: BaseType): param is LongType {
    return param.typeName === TypeName.LONG;
}

export function isVoidType(param: BaseType): param is VoidType {
    return param.typeName === TypeName.VOID;
}

export function isNeverType(param: BaseType): param is NeverType {
    return param.typeName === TypeName.NEVER;
}

// -------------------------------------------
// Simple Type Guards
// -------------------------------------------

export function isDateType(param: BaseType): param is DateType {
    return param.typeName === TypeName.DATE;
}

export function isFileType(param: BaseType): param is FileType {
    return param.typeName === TypeName.FILE;
}

export function isDateTimeType(param: BaseType): param is DateTimeType {
    return param.typeName === TypeName.DATETIME;
}

export function isBinaryType(param: BaseType): param is BinaryType {
    return param.typeName === TypeName.BINARY;
}

export function isBufferType(param: BaseType): param is BufferType {
    return param.typeName === TypeName.BUFFER;
}

export function isByteType(param: BaseType): param is ByteType {
    return param.typeName === TypeName.BYTE;
}

export function isObjectType(param: BaseType): param is ObjectType {
    return param.typeName === TypeName.OBJECT;
}

// -------------------------------------------
// Complex Type Guards
// -------------------------------------------

export function isEnumType(param: BaseType): param is EnumType {
    return param.typeName === TypeName.ENUM;
}

export function isArrayType(param: BaseType): param is ArrayType {
    return param.typeName === TypeName.ARRAY;
}

export function isNestedObjectLiteralType(param: BaseType): param is NestedObjectLiteralType {
    return param.typeName === TypeName.NESTED_OBJECT_LITERAL;
}

export function isIntersectionType(param: BaseType): param is IntersectionType {
    return param.typeName === TypeName.INTERSECTION;
}

export function isUnionType(param: BaseType): param is UnionType {
    return param.typeName === TypeName.UNION;
}

export function isTupleType(param: BaseType): param is TupleType {
    return param.typeName === TypeName.TUPLE;
}

// -------------------------------------------
// Reference Type Guards
// -------------------------------------------

export function isRefEnumType(param: BaseType): param is RefEnumType {
    return param.typeName === TypeName.REF_ENUM;
}

export function isRefObjectType(param: BaseType): param is RefObjectType {
    return param.typeName === TypeName.REF_OBJECT;
}

export function isRefAliasType(param: BaseType): param is RefAliasType {
    return param.typeName === TypeName.REF_ALIAS;
}

export function isReferenceType(param: BaseType): param is ReferenceType {
    return param.typeName === TypeName.REF_ALIAS ||
        param.typeName === TypeName.REF_ENUM ||
        param.typeName === TypeName.REF_OBJECT;
}

export function isPrimitiveType(type: BaseType): type is PrimitiveType {
    return isAnyType(type) ||
        isBinaryType(type) ||
        isBooleanType(type) ||
        isBufferType(type) ||
        isByteType(type) ||
        isDateType(type) ||
        isDateTimeType(type) ||
        isBigintType(type) ||
        isDoubleType(type) ||
        isFloatType(type) ||
        isFileType(type) ||
        isIntegerType(type) ||
        isLongType(type) ||
        isObjectType(type) ||
        isStringType(type) ||
        isUndefinedType(type);
}
