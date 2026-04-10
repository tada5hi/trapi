/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    describe,
    expect,
    it,
} from 'vitest';
import { Version, generate } from '../../../src';
import {
    arrayType,
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createProperty,
    createRefEnum,
    createRefObject,
    createResponse,
    enumType,
    fileType,
    integerType,
    refObjectType,
    stringType,
    unionType,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV3Spec } from '../../helpers/schema-validator';

const servers = 'http://localhost:3000/';

describe('OAI schema validation', () => {
    describe('empty spec', () => {
        it('V2: empty metadata should produce a valid spec', async () => {
            const metadata = createMetadata([]);
            const spec = await generate({
                version: Version.V2,
                options: {
                    output: false, 
                    servers, 
                    metadata, 
                },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('V3: empty metadata should produce a valid spec', async () => {
            const metadata = createMetadata([]);
            const spec = await generate({
                version: Version.V3,
                options: {
                    output: false, 
                    servers, 
                    metadata, 
                },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });
    });

    describe('basic CRUD controller', () => {
        const metadata = createMetadata(
            [
                createController({
                    name: 'UserController',
                    path: 'users',
                    methods: [
                        createMethod({
                            name: 'getUsers',
                            method: 'get',
                            path: '',
                            responses: [createResponse({ status: '200', schema: arrayType(refObjectType('User')) })],
                            type: arrayType(refObjectType('User')),
                        }),
                        createMethod({
                            name: 'getUserById',
                            method: 'get',
                            path: '{id}',
                            parameters: [
                                createParameter({
                                    name: 'id', 
                                    in: 'path', 
                                    type: stringType(), 
                                    required: true, 
                                }),
                            ],
                            responses: [createResponse({ status: '200', schema: refObjectType('User') })],
                            type: refObjectType('User'),
                        }),
                        createMethod({
                            name: 'createUser',
                            method: 'post',
                            path: '',
                            parameters: [
                                createParameter({
                                    name: 'body', 
                                    in: 'body', 
                                    type: refObjectType('User'), 
                                }),
                            ],
                            responses: [
                                createResponse({
                                    status: '201', 
                                    schema: refObjectType('User'), 
                                    description: 'Created', 
                                }),
                            ],
                            type: refObjectType('User'),
                        }),
                        createMethod({
                            name: 'deleteUser',
                            method: 'delete',
                            path: '{id}',
                            parameters: [
                                createParameter({
                                    name: 'id', 
                                    in: 'path', 
                                    type: stringType(), 
                                    required: true, 
                                }),
                            ],
                            responses: [createResponse({ status: '204', description: 'Deleted' })],
                        }),
                    ],
                }),
            ],
            {
                User: createRefObject('User', [
                    createProperty({
                        name: 'id', 
                        type: stringType(), 
                        required: true, 
                    }),
                    createProperty({
                        name: 'name', 
                        type: stringType(), 
                        required: true, 
                    }),
                    createProperty({ name: 'email', type: stringType() }),
                    createProperty({ name: 'age', type: integerType() }),
                ]),
            },
        );

        it('V2: CRUD controller should produce a valid spec', async () => {
            const spec = await generate({
                version: Version.V2,
                options: {
                    output: false, 
                    servers, 
                    metadata, 
                },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('V3: CRUD controller should produce a valid spec', async () => {
            const spec = await generate({
                version: Version.V3,
                options: {
                    output: false, 
                    servers, 
                    metadata, 
                },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });
    });

    describe('complex types', () => {
        const metadata = createMetadata(
            [
                createController({
                    name: 'ComplexController',
                    path: 'complex',
                    methods: [
                        createMethod({
                            name: 'getWithEnum',
                            method: 'get',
                            path: 'enum',
                            parameters: [
                                createParameter({
                                    name: 'status',
                                    in: 'query',
                                    type: enumType(['active', 'inactive', 'pending']),
                                }),
                            ],
                            responses: [createResponse({ status: '200', schema: refObjectType('Item') })],
                            type: refObjectType('Item'),
                        }),
                        createMethod({
                            name: 'getNullable',
                            method: 'get',
                            path: 'nullable',
                            responses: [createResponse({ status: '200', schema: refObjectType('NullableModel') })],
                            type: refObjectType('NullableModel'),
                        }),
                        createMethod({
                            name: 'uploadFile',
                            method: 'post',
                            path: 'upload',
                            parameters: [
                                createParameter({
                                    name: 'file', 
                                    in: 'formData', 
                                    type: fileType(), 
                                }),
                                createParameter({
                                    name: 'description', 
                                    in: 'formData', 
                                    type: stringType(), 
                                }),
                            ],
                        }),
                    ],
                }),
            ],
            {
                Item: createRefObject('Item', [
                    createProperty({
                        name: 'id', 
                        type: integerType(), 
                        required: true, 
                    }),
                    createProperty({
                        name: 'name', 
                        type: stringType(), 
                        required: true, 
                    }),
                    createProperty({ name: 'tags', type: arrayType(stringType()) }),
                ]),
                Status: createRefEnum('Status', ['active', 'inactive', 'pending']),
                NullableModel: createRefObject('NullableModel', [
                    createProperty({
                        name: 'value', 
                        type: stringType(), 
                        required: true, 
                    }),
                    createProperty({
                        name: 'optional',
                        type: unionType([stringType(), { typeName: 'enum', members: [null] }]),
                    }),
                ]),
            },
        );

        it('V2: complex types should produce a valid spec', async () => {
            const spec = await generate({
                version: Version.V2,
                options: {
                    output: false, 
                    servers, 
                    metadata, 
                },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('V3: complex types should produce a valid spec', async () => {
            const spec = await generate({
                version: Version.V3,
                options: {
                    output: false, 
                    servers, 
                    metadata, 
                },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });
    });

    describe('security definitions', () => {
        it('V2: spec with security should be valid', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'SecureController',
                    path: 'secure',
                    security: [{ bearerAuth: [] }],
                    methods: [
                        createMethod({
                            name: 'getSecure',
                            method: 'get',
                            path: '',
                            security: [{ bearerAuth: [] }],
                        }),
                    ],
                }),
            ]);

            const spec = await generate({
                version: Version.V2,
                options: {
                    output: false,
                    servers,
                    metadata,
                    securityDefinitions: { bearerAuth: { type: 'http', scheme: 'basic' } },
                },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('V3: spec with security should be valid', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'SecureController',
                    path: 'secure',
                    security: [{ bearerAuth: [] }],
                    methods: [
                        createMethod({
                            name: 'getSecure',
                            method: 'get',
                            path: '',
                            security: [{ bearerAuth: [] }],
                        }),
                    ],
                }),
            ]);

            const spec = await generate({
                version: Version.V3,
                options: {
                    output: false,
                    servers,
                    metadata,
                    securityDefinitions: { bearerAuth: { type: 'http', scheme: 'basic' } },
                },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });
    });
});
