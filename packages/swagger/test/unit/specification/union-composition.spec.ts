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
import { Version, generate } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createProperty,
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
        specV2 = await generate({
            version: Version.V2,
            options: {
                output: false,
                servers: 'http://localhost:3000/',
                metadata,
            },
        });

        specV3 = await generate({
            version: Version.V3,
            options: {
                output: false,
                servers: 'http://localhost:3000/',
                metadata,
            },
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
