/*
 * Copyright (c) 2024.
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
    createParameter,
    createProperty,
    createRefObject,
    createResponse,
    integerType,
    refObjectType,
    stringType,
    voidType,
} from '../../helpers/metadata-builder';

describe('multiple response status codes', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const referenceTypes = {
        User: createRefObject('User', [
            createProperty({ name: 'id', type: integerType() }),
            createProperty({ name: 'name', type: stringType() }),
        ]),
        ErrorResponse: createRefObject('ErrorResponse', [
            createProperty({ name: 'message', type: stringType() }),
            createProperty({ name: 'code', type: integerType() }),
        ]),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'UserController',
                path: 'users',
                methods: [
                    createMethod({
                        name: 'getUser',
                        method: 'get',
                        path: '{id}',
                        parameters: [
                            createParameter({
                                name: 'id',
                                in: 'path',
                                type: stringType(),
                            }),
                        ],
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'User found',
                                schema: refObjectType('User'),
                                examples: [{ value: { id: 1, name: 'John' }, label: 'default' }],
                            }),
                            createResponse({
                                status: '404',
                                description: 'User not found',
                                schema: refObjectType('ErrorResponse'),
                            }),
                            createResponse({
                                status: '500',
                                description: 'Internal server error',
                                schema: refObjectType('ErrorResponse'),
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
                            }),
                        ],
                        responses: [
                            createResponse({
                                status: '204',
                                description: 'User deleted',
                            }),
                            createResponse({
                                status: '404',
                                description: 'User not found',
                                schema: refObjectType('ErrorResponse'),
                            }),
                        ],
                        type: voidType(),
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
                                description: 'User created',
                                schema: refObjectType('User'),
                                examples: [
                                    { value: { id: 1, name: 'Alice' }, label: 'example1' },
                                    { value: { id: 2, name: 'Bob' }, label: 'example2' },
                                ],
                            }),
                            createResponse({
                                status: '400',
                                description: 'Bad request',
                                schema: refObjectType('ErrorResponse'),
                            }),
                            createResponse({
                                status: '409',
                                description: 'Conflict',
                                schema: refObjectType('ErrorResponse'),
                            }),
                        ],
                        type: refObjectType('User'),
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

    describe('V2', () => {
        it('should have all response status codes for GET', () => {
            const { responses } = (specV2.paths['/users/{id}'].get!);
            expect(responses).toHaveProperty('200');
            expect(responses).toHaveProperty('404');
            expect(responses).toHaveProperty('500');
        });

        it('should have correct descriptions for each status', () => {
            const { responses } = (specV2.paths['/users/{id}'].get!);
            expect(responses['200'].description).toEqual('User found');
            expect(responses['404'].description).toEqual('User not found');
            expect(responses['500'].description).toEqual('Internal server error');
        });

        it('should have schema for non-void responses', () => {
            const { responses } = (specV2.paths['/users/{id}'].get!);
            expect(responses['200'].schema).toBeDefined();
            expect(responses['404'].schema).toBeDefined();
        });

        it('should not have schema for void (204) responses', () => {
            const { responses } = (specV2.paths['/users/{id}'].delete!);
            expect(responses['204'].description).toEqual('User deleted');
            expect(responses['204'].schema).toBeUndefined();
        });

        it('should have response status codes as strings', () => {
            const { responses } = (specV2.paths['/users/{id}'].get!);
            const keys = Object.keys(responses);
            for (const key of keys) {
                expect(typeof key).toBe('string');
                expect(key).toMatch(/^[1-5]\d{2}$|^default$/);
            }
        });

        it('should include examples for responses that have them', () => {
            const response = specV2.paths['/users/{id}'].get!.responses['200'];
            expect(response.examples).toBeDefined();
        });

        it('should support multiple examples on POST response', () => {
            const response = specV2.paths['/users'].post!.responses['201'];
            expect(response.examples).toBeDefined();
        });

        it('should produce different schemas for success and error responses', () => {
            const { responses } = (specV2.paths['/users/{id}'].get!);
            const successRef = responses['200'].schema?.$ref;
            const errorRef = responses['404'].schema?.$ref;
            expect(successRef).toContain('User');
            expect(errorRef).toContain('ErrorResponse');
            expect(successRef).not.toEqual(errorRef);
        });
    });

    describe('V3', () => {
        it('should have all response status codes for GET', () => {
            const { responses } = (specV3.paths['/users/{id}'].get!);
            expect(responses).toHaveProperty('200');
            expect(responses).toHaveProperty('404');
            expect(responses).toHaveProperty('500');
        });

        it('should have content with schema for non-void responses', () => {
            const response = specV3.paths['/users/{id}'].get!.responses['200'];
            expect(response.content).toBeDefined();
            expect(response.content!['application/json']).toBeDefined();
            expect(response.content!['application/json'].schema).toBeDefined();
        });

        it('should not have content for void (204) responses', () => {
            const { responses } = (specV3.paths['/users/{id}'].delete!);
            expect(responses['204'].description).toEqual('User deleted');
            expect(responses['204'].content).toBeUndefined();
        });

        it('should include examples in content media type', () => {
            const { content } = specV3.paths['/users'].post!.responses['201'];
            expect(content).toBeDefined();
            const jsonContent = content!['application/json'];
            expect(jsonContent.examples).toBeDefined();
            expect(jsonContent.examples!.example1).toBeDefined();
            expect(jsonContent.examples!.example2).toBeDefined();
        });

        it('should produce different schemas for success and error responses', () => {
            const { responses } = (specV3.paths['/users/{id}'].get!);
            const successSchema = responses['200'].content!['application/json'].schema;
            const errorSchema = responses['404'].content!['application/json'].schema;
            expect(successSchema.$ref).toContain('User');
            expect(errorSchema.$ref).toContain('ErrorResponse');
        });
    });
});
