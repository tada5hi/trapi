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
import { Version, generateSwagger } from '../../../src';
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
import { validateV2Spec, validateV31Spec, validateV3Spec } from '../../helpers/schema-validator';

const servers = 'http://localhost:3000/';

describe('OAI schema validation', () => {
    describe('empty spec', () => {
        it('V2: empty metadata should produce a valid spec', async () => {
            const metadata = createMetadata([]);
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('V3: empty metadata should produce a valid spec', async () => {
            const metadata = createMetadata([]);
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
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
                    paths: ['users'],
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
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('V3: CRUD controller should produce a valid spec', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
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
                    paths: ['complex'],
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
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('V3: complex types should produce a valid spec', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });
    });

    describe('V3.1 schema validation', () => {
        it('V3.1: empty metadata should produce a valid spec', async () => {
            const metadata = createMetadata([]);
            const spec = await generateSwagger({
                version: Version.V3_1,
                metadata,
                data: { servers },
            });

            expect(spec.openapi).toEqual('3.1.0');
            const result = validateV31Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('V3.1: CRUD controller should produce a valid spec', async () => {
            const crudMetadata = createMetadata(
                [
                    createController({
                        name: 'ItemController',
                        paths: ['items'],
                        methods: [
                            createMethod({
                                name: 'getItems',
                                method: 'get',
                                path: '',
                                type: arrayType(refObjectType('Item')),
                                responses: [createResponse({ status: '200', schema: arrayType(refObjectType('Item')) })],
                            }),
                            createMethod({
                                name: 'createItem',
                                method: 'post',
                                path: '',
                                parameters: [
                                    createParameter({
                                        name: 'body', 
                                        in: 'body', 
                                        type: refObjectType('Item'), 
                                    }),
                                ],
                                type: refObjectType('Item'),
                                responses: [createResponse({
                                    status: '201', 
                                    schema: refObjectType('Item'), 
                                    description: 'Created', 
                                })],
                            }),
                        ],
                    }),
                ],
                {
                    Item: createRefObject('Item', [
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
                    ]),
                },
            );

            const spec = await generateSwagger({
                version: Version.V3_1,
                metadata: crudMetadata,
                data: { servers },
            });

            const result = validateV31Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('V3.2: should produce valid spec with version 3.2.0', async () => {
            const metadata = createMetadata([]);
            const spec = await generateSwagger({
                version: Version.V3_2,
                metadata,
                data: { servers },
            });

            expect(spec.openapi).toEqual('3.2.0');
            // V3.2 schema not yet available from OAI; validate against 3.1 schema
            // but filter out the version pattern mismatch (3.1 schema expects 3.1.x)
            const result = validateV31Spec(spec);
            const nonVersionErrors = result.errors.filter(
                (e) => !e.includes('must match pattern'),
            );
            expect(nonVersionErrors, nonVersionErrors.join('\n')).toEqual([]);
        });
    });

    describe('security definitions', () => {
        it('V2: spec with security should be valid', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'SecureController',
                    paths: ['secure'],
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

            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: {
                    servers,
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
                    paths: ['secure'],
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

            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: {
                    servers,
                    securityDefinitions: { bearerAuth: { type: 'http', scheme: 'basic' } },
                },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
            expect(result.valid).toBe(true);
        });
    });
});
