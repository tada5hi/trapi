/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ArrayType,
    Controller,
    EnumType,
    IntersectionType,
    Metadata,
    Method,
    Parameter,
    RefAliasType,
    RefEnumType,
    RefObjectType,
    ReferenceTypes,
    ResolverProperty,
    Response,
    Type, 
    UnionType, 
} from '@trapi/core';

/**
 * Creates a minimal valid Metadata object for testing swagger generation.
 * Uses inline metadata construction instead of loading from fixture files,
 * so each test is self-contained and focused.
 */
export function createMetadata(
    controllers: Controller[],
    referenceTypes: ReferenceTypes = {},
): Metadata {
    return { controllers, referenceTypes };
}

export function createController(
    overrides: Partial<Controller> & Pick<Controller, 'name' | 'paths' | 'methods'>,
): Controller {
    return {
        consumes: [],
        extensions: [],
        hidden: false,
        location: '/test/fake.ts',
        produces: [],
        responses: [],
        security: [],
        tags: [],
        ...overrides,
    };
}

export function createMethod(
    overrides: Partial<Method> & Pick<Method, 'name' | 'method' | 'path'>,
): Method {
    return {
        consumes: [],
        deprecated: false,
        description: '',
        extensions: [],
        hidden: false,
        parameters: [],
        produces: [],
        responses: [
            {
                description: 'Ok',
                examples: [],
                name: '200',
                status: '200',
                schema: voidType(),
            },
        ],
        security: [],
        tags: [],
        type: voidType(),
        ...overrides,
    };
}

export function createParameter(
    overrides: Partial<Parameter> & Pick<Parameter, 'name' | 'in' | 'type'>,
): Parameter {
    return {
        description: '',
        parameterName: overrides.name,
        required: true,
        deprecated: false,
        extensions: [],
        validators: {},
        ...overrides,
    };
}

export function createResponse(
    overrides: Partial<Response> & Pick<Response, 'status'>,
): Response {
    return {
        description: 'Ok',
        examples: [],
        name: overrides.status,
        ...overrides,
    };
}

export function createProperty(
    overrides: Partial<ResolverProperty> & Pick<ResolverProperty, 'name' | 'type'>,
): ResolverProperty {
    return {
        deprecated: false,
        required: true,
        validators: {},
        ...overrides,
    };
}

export function createRefObject(
    refName: string,
    properties: ResolverProperty[],
    overrides?: Partial<RefObjectType>,
): RefObjectType {
    return {
        typeName: 'refObject',
        refName,
        properties,
        deprecated: false,
        ...overrides,
    };
}

export function createRefEnum(
    refName: string,
    members: Array<string | number | boolean>,
    overrides?: Partial<RefEnumType>,
): RefEnumType {
    return {
        typeName: 'refEnum',
        refName,
        members,
        deprecated: false,
        ...overrides,
    };
}

export function createRefAlias(
    refName: string,
    type: Type,
    overrides?: Partial<Omit<RefAliasType, 'type'>>,
): RefAliasType {
    return {
        typeName: 'refAlias',
        refName,
        type,
        deprecated: false,
        validators: {},
        ...overrides,
    } as RefAliasType;
}

// Type factory helpers

export function voidType(): Type {
    return { typeName: 'void' };
}

export function neverType(): Type {
    return { typeName: 'never' };
}

export function undefinedType(): Type {
    return { typeName: 'undefined' };
}

export function stringType(): Type {
    return { typeName: 'string' };
}

export function anyType(): Type {
    return { typeName: 'any' };
}

export function objectType(): Type {
    return { typeName: 'object' };
}

export function integerType(): Type {
    return { typeName: 'integer' };
}

export function doubleType(): Type {
    return { typeName: 'double' };
}

export function booleanType(): Type {
    return { typeName: 'boolean' };
}

export function fileType(): Type {
    return { typeName: 'file' };
}

// What the TypeScript resolver actually emits for an upload parameter — it
// never produces `file`, so a fixture using `fileType()` alone would not catch
// a regression that only affects real projects.
export function bufferType(): Type {
    return { typeName: 'buffer' };
}

export function arrayType(elementType: Type): ArrayType {
    return { typeName: 'array', elementType };
}

export function enumType(members: Array<string | number | boolean | null>): EnumType {
    return { typeName: 'enum', members };
}

export function unionType(members: Type[]): UnionType {
    return { typeName: 'union', members };
}

export function intersectionType(members: Type[]): IntersectionType {
    return { typeName: 'intersection', members };
}

export function refObjectType(refName: string): RefObjectType {
    return {
        typeName: 'refObject', 
        refName, 
        properties: [], 
        deprecated: false, 
    };
}

export function refEnumType(refName: string, members: Array<string | number | boolean>): RefEnumType {
    return {
        typeName: 'refEnum', 
        refName, 
        members, 
        deprecated: false, 
    };
}
