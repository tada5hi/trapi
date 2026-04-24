/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { SpecV2, SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createProperty,
    createRefAlias,
    createRefObject,
    createResponse,
    enumType,
    refObjectType,
    stringType,
    unionType,
} from '../../helpers/metadata-builder';

describe('union composition (oneOf / discriminator)', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;
    let specV31: SpecV3;

    const referenceTypes = {
        User: createRefObject('User', [
            createProperty({ name: 'id', type: { typeName: 'integer' } }),
            createProperty({ name: 'name', type: stringType() }),
        ]),
        ErrorModel: createRefObject('ErrorModel', [
            createProperty({ name: 'code', type: { typeName: 'integer' } }),
            createProperty({ name: 'message', type: stringType() }),
        ]),
        Circle: createRefObject('Circle', [
            createProperty({ name: 'kind', type: enumType(['circle']) }),
            createProperty({ name: 'radius', type: { typeName: 'double' } }),
        ]),
        Square: createRefObject('Square', [
            createProperty({ name: 'kind', type: enumType(['square']) }),
            createProperty({ name: 'side', type: { typeName: 'double' } }),
        ]),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'CompositionController',
                path: 'composition',
                methods: [
                    createMethod({
                        name: 'getResult',
                        method: 'get',
                        path: 'result',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: unionType([
                                    refObjectType('User'),
                                    refObjectType('ErrorModel'),
                                ]),
                            }),
                        ],
                        type: unionType([
                            refObjectType('User'),
                            refObjectType('ErrorModel'),
                        ]),
                    }),
                    createMethod({
                        name: 'getShape',
                        method: 'get',
                        path: 'shape',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: unionType([
                                    refObjectType('Circle'),
                                    refObjectType('Square'),
                                ]),
                            }),
                        ],
                        type: unionType([
                            refObjectType('Circle'),
                            refObjectType('Square'),
                        ]),
                    }),
                    createMethod({
                        name: 'getStatus',
                        method: 'get',
                        path: 'status',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: unionType([
                                    enumType(['active']),
                                    enumType(['inactive']),
                                    enumType(['deleted']),
                                ]),
                            }),
                        ],
                        type: unionType([
                            enumType(['active']),
                            enumType(['inactive']),
                            enumType(['deleted']),
                        ]),
                    }),
                    createMethod({
                        name: 'getMixed',
                        method: 'get',
                        path: 'mixed',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: unionType([
                                    refObjectType('User'),
                                    stringType(),
                                ]),
                            }),
                        ],
                        type: unionType([
                            refObjectType('User'),
                            stringType(),
                        ]),
                    }),
                    createMethod({
                        name: 'getNullableResult',
                        method: 'get',
                        path: 'nullable',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: unionType([
                                    refObjectType('User'),
                                    refObjectType('ErrorModel'),
                                    enumType([null]),
                                ]),
                            }),
                        ],
                        type: unionType([
                            refObjectType('User'),
                            refObjectType('ErrorModel'),
                            enumType([null]),
                        ]),
                    }),
                ],
            }),
        ],
        referenceTypes,
    );

    beforeAll(async () => {
        specV2 = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });

        specV3 = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });

        specV31 = await generateSwagger({
            version: Version.V3_1,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
    });

    describe('V3 oneOf', () => {
        it('should use oneOf for object union (User | ErrorModel)', () => {
            const { schema } = specV3.paths['/composition/result'].get!.responses['200'].content['application/json'];
            expect(schema).toHaveProperty('oneOf');
            expect(schema).not.toHaveProperty('anyOf');
            expect(schema.oneOf).toHaveLength(2);
            expect(schema.oneOf[0].$ref).toEqual('#/components/schemas/User');
            expect(schema.oneOf[1].$ref).toEqual('#/components/schemas/ErrorModel');
        });

        it('should use enum for string literal union (not oneOf)', () => {
            const { schema } = specV3.paths['/composition/status'].get!.responses['200'].content['application/json'];
            expect(schema).not.toHaveProperty('oneOf');
            expect(schema).not.toHaveProperty('anyOf');
            expect(schema.type).toEqual('string');
            expect(schema.enum).toBeDefined();
            expect(schema.enum).toContain('active');
            expect(schema.enum).toContain('inactive');
            expect(schema.enum).toContain('deleted');
        });

        it('should use anyOf for mixed union (object + primitive)', () => {
            const { schema } = specV3.paths['/composition/mixed'].get!.responses['200'].content['application/json'];
            expect(schema).toHaveProperty('anyOf');
            expect(schema).not.toHaveProperty('oneOf');
            expect(schema.anyOf).toHaveLength(2);
        });

        it('should use oneOf with nullable for nullable object union', () => {
            const { schema } = specV3.paths['/composition/nullable'].get!.responses['200'].content['application/json'];
            expect(schema).toHaveProperty('oneOf');
            expect(schema.oneOf).toHaveLength(2);
            expect(schema.nullable).toBe(true);
        });
    });

    describe('V3.1 oneOf (type: null instead of nullable)', () => {
        it('should use oneOf for object union', () => {
            const { schema } = specV31.paths['/composition/result'].get!.responses['200'].content['application/json'];
            expect(schema).toHaveProperty('oneOf');
            expect(schema).not.toHaveProperty('anyOf');
            expect(schema.oneOf).toHaveLength(2);
            expect(schema.oneOf![0].$ref).toEqual('#/components/schemas/User');
            expect(schema.oneOf![1].$ref).toEqual('#/components/schemas/ErrorModel');
        });

        it('should use { type: "null" } instead of nullable for nullable object union', () => {
            const { schema } = specV31.paths['/composition/nullable'].get!.responses['200'].content['application/json'];
            expect(schema).toHaveProperty('oneOf');
            expect(schema).not.toHaveProperty('nullable');
            // 3.1+: nullable members are represented as { type: 'null' } in the oneOf array
            const nullMember = schema.oneOf!.find((s: any) => s.type === 'null');
            expect(nullMember).toBeDefined();
            // Two object refs + null type member
            expect(schema.oneOf).toHaveLength(3);
        });
    });

    describe('V3 discriminator', () => {
        it('should detect discriminator for discriminated union (Circle | Square)', () => {
            const { schema } = specV3.paths['/composition/shape'].get!.responses['200'].content['application/json'];
            expect(schema).toHaveProperty('oneOf');
            expect(schema.oneOf).toHaveLength(2);
            expect(schema).toHaveProperty('discriminator');
            const disc = schema.discriminator as { propertyName: string; mapping?: Record<string, string> };
            expect(disc.propertyName).toEqual('kind');
            expect(disc.mapping).toEqual({
                circle: '#/components/schemas/Circle',
                square: '#/components/schemas/Square',
            });
        });

        it('should not add discriminator for non-discriminated object union', () => {
            const { schema } = specV3.paths['/composition/result'].get!.responses['200'].content['application/json'];
            expect(schema).toHaveProperty('oneOf');
            expect(schema).not.toHaveProperty('discriminator');
        });
    });

    describe('V2 unchanged', () => {
        it('should not use oneOf in V2 output', () => {
            const response = specV2.paths['/composition/result'].get!.responses['200'];
            expect(response.schema).not.toHaveProperty('oneOf');
        });
    });
});

describe('discriminator with refAlias members (#783)', () => {
    let specV3Alias: SpecV3;

    const aliasReferenceTypes = {
        Circle: createRefObject('Circle', [
            createProperty({ name: 'kind', type: enumType(['circle']) }),
            createProperty({ name: 'radius', type: { typeName: 'double' } }),
        ]),
        Square: createRefObject('Square', [
            createProperty({ name: 'kind', type: enumType(['square']) }),
            createProperty({ name: 'side', type: { typeName: 'double' } }),
        ]),
        CircleAlias: createRefAlias('CircleAlias', refObjectType('Circle')),
        SquareAlias: createRefAlias('SquareAlias', refObjectType('Square')),
    };

    const aliasMetadata = createMetadata(
        [
            createController({
                name: 'AliasController',
                path: 'alias',
                methods: [
                    createMethod({
                        name: 'getShape',
                        method: 'get',
                        path: 'shape',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: unionType([
                                    createRefAlias('CircleAlias', refObjectType('Circle')),
                                    createRefAlias('SquareAlias', refObjectType('Square')),
                                ]),
                            }),
                        ],
                        type: unionType([
                            createRefAlias('CircleAlias', refObjectType('Circle')),
                            createRefAlias('SquareAlias', refObjectType('Square')),
                        ]),
                    }),
                ],
            }),
        ],
        aliasReferenceTypes,
    );

    beforeAll(async () => {
        specV3Alias = await generateSwagger({
            version: Version.V3,
            metadata: aliasMetadata,
            data: { servers: 'http://localhost:3000/' },
        });
    });

    it('should detect discriminator for union of refAlias members', () => {
        const { schema } = specV3Alias.paths['/alias/shape'].get!.responses['200'].content['application/json'];
        expect(schema).toHaveProperty('oneOf');
        expect(schema.oneOf).toHaveLength(2);
        expect(schema).toHaveProperty('discriminator');
        const disc = schema.discriminator as { propertyName: string; mapping?: Record<string, string> };
        expect(disc.propertyName).toEqual('kind');
        expect(disc.mapping).toEqual({
            circle: '#/components/schemas/CircleAlias',
            square: '#/components/schemas/SquareAlias',
        });
    });
});

describe('discriminator with refAlias wrapping nestedObjectLiteral (#783)', () => {
    let specV3: SpecV3;

    const referenceTypes = {
        InlineCircle: createRefAlias('InlineCircle', {
            typeName: 'nestedObjectLiteral',
            properties: [
                createProperty({ name: 'kind', type: enumType(['circle']) }),
                createProperty({ name: 'radius', type: { typeName: 'double' } }),
            ],
        } as any),
        InlineSquare: createRefAlias('InlineSquare', {
            typeName: 'nestedObjectLiteral',
            properties: [
                createProperty({ name: 'kind', type: enumType(['square']) }),
                createProperty({ name: 'side', type: { typeName: 'double' } }),
            ],
        } as any),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'InlineController',
                path: 'inline',
                methods: [
                    createMethod({
                        name: 'getShape',
                        method: 'get',
                        path: 'shape',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: unionType([
                                    createRefAlias('InlineCircle', refObjectType('_unused')),
                                    createRefAlias('InlineSquare', refObjectType('_unused')),
                                ]),
                            }),
                        ],
                        type: unionType([
                            createRefAlias('InlineCircle', refObjectType('_unused')),
                            createRefAlias('InlineSquare', refObjectType('_unused')),
                        ]),
                    }),
                ],
            }),
        ],
        referenceTypes,
    );

    beforeAll(async () => {
        specV3 = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
    });

    it('should detect discriminator for refAlias wrapping nestedObjectLiteral', () => {
        const { schema } = specV3.paths['/inline/shape'].get!.responses['200'].content['application/json'];
        expect(schema).toHaveProperty('oneOf');
        expect(schema.oneOf).toHaveLength(2);
        expect(schema).toHaveProperty('discriminator');
        const disc = schema.discriminator as { propertyName: string; mapping?: Record<string, string> };
        expect(disc.propertyName).toEqual('kind');
        expect(disc.mapping).toEqual({
            circle: '#/components/schemas/InlineCircle',
            square: '#/components/schemas/InlineSquare',
        });
    });
});

describe('discriminator with mixed refObject + refAlias members (#783)', () => {
    let specV3: SpecV3;

    const referenceTypes = {
        Circle: createRefObject('Circle', [
            createProperty({ name: 'kind', type: enumType(['circle']) }),
            createProperty({ name: 'radius', type: { typeName: 'double' } }),
        ]),
        Square: createRefObject('Square', [
            createProperty({ name: 'kind', type: enumType(['square']) }),
            createProperty({ name: 'side', type: { typeName: 'double' } }),
        ]),
        SquareAlias: createRefAlias('SquareAlias', refObjectType('Square')),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'MixedController',
                path: 'mixed',
                methods: [
                    createMethod({
                        name: 'getShape',
                        method: 'get',
                        path: 'shape',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Success',
                                schema: unionType([
                                    refObjectType('Circle'),
                                    createRefAlias('SquareAlias', refObjectType('Square')),
                                ]),
                            }),
                        ],
                        type: unionType([
                            refObjectType('Circle'),
                            createRefAlias('SquareAlias', refObjectType('Square')),
                        ]),
                    }),
                ],
            }),
        ],
        referenceTypes,
    );

    beforeAll(async () => {
        specV3 = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
    });

    it('should detect discriminator for mixed refObject + refAlias union', () => {
        const { schema } = specV3.paths['/mixed/shape'].get!.responses['200'].content['application/json'];
        expect(schema).toHaveProperty('oneOf');
        expect(schema.oneOf).toHaveLength(2);
        expect(schema).toHaveProperty('discriminator');
        const disc = schema.discriminator as { propertyName: string; mapping?: Record<string, string> };
        expect(disc.propertyName).toEqual('kind');
        expect(disc.mapping).toEqual({
            circle: '#/components/schemas/Circle',
            square: '#/components/schemas/SquareAlias',
        });
    });
});
