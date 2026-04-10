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
    createProperty,
    createRefObject,
    createResponse,
    integerType,
    refObjectType,
    stringType,
    voidType,
} from '../../helpers/metadata-builder';

describe('edge cases and spec compliance', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const referenceTypes = {
        EmptyModel: createRefObject('EmptyModel', [
            createProperty({
                name: 'optional1',
                type: stringType(),
                required: false,
            }),
            createProperty({
                name: 'optional2',
                type: integerType(),
                required: false,
            }),
        ]),
        RequiredModel: createRefObject('RequiredModel', [
            createProperty({
                name: 'required1',
                type: stringType(),
                required: true,
            }),
            createProperty({
                name: 'optional1',
                type: stringType(),
                required: false,
            }),
        ]),
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'EdgeCaseController',
                path: 'edge',
                methods: [
                    createMethod({
                        name: 'voidResponse',
                        method: 'delete',
                        path: 'void',
                        responses: [
                            createResponse({
                                status: '204',
                                description: 'No content',
                                schema: voidType(),
                            }),
                        ],
                        type: voidType(),
                    }),
                    createMethod({
                        name: 'allOptional',
                        method: 'get',
                        path: 'optional',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'All optional fields',
                                schema: refObjectType('EmptyModel'),
                            }),
                        ],
                        type: refObjectType('EmptyModel'),
                    }),
                    createMethod({
                        name: 'mixedRequired',
                        method: 'get',
                        path: 'mixed',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Mixed required',
                                schema: refObjectType('RequiredModel'),
                            }),
                        ],
                        type: refObjectType('RequiredModel'),
                    }),
                    createMethod({
                        name: 'undefinedField',
                        method: 'get',
                        path: 'undefined',
                        responses: [
                            createResponse({
                                status: '200',
                                description: 'Default response',
                            }),
                        ],
                        type: voidType(),
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

    describe('empty required arrays', () => {
        it('V2: should not emit required array when all properties are optional', () => {
            const def = specV2.definitions!.EmptyModel;
            expect(def.required).toBeUndefined();
        });

        it('V3: should not emit required array when all properties are optional', () => {
            const schema = specV3.components.schemas!.EmptyModel;
            expect(schema.required).toBeUndefined();
        });

        it('V2: should emit required array only with required properties', () => {
            const def = specV2.definitions!.RequiredModel;
            expect(def.required).toBeDefined();
            expect(def.required).toEqual(['required1']);
            expect(def.required).not.toContain('optional1');
        });

        it('V3: should emit required array only with required properties', () => {
            const schema = specV3.components.schemas!.RequiredModel;
            expect(schema.required).toBeDefined();
            expect(schema.required).toEqual(['required1']);
        });
    });

    describe('void responses', () => {
        it('V2: should not have schema for void response', () => {
            const response = specV2.paths['/edge/void'].delete!.responses['204'];
            expect(response.description).toEqual('No content');
            expect(response.schema).toBeUndefined();
        });

        it('V3: should not have content for void response', () => {
            const response = specV3.paths['/edge/void'].delete!.responses['204'];
            expect(response.description).toEqual('No content');
            expect(response.content).toBeUndefined();
        });
    });

    describe('response status codes', () => {
        it('V2: all response codes should be valid HTTP status codes or default', () => {
            for (const pathKey of Object.keys(specV2.paths)) {
                const pathItem = specV2.paths[pathKey];
                for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
                    const op = pathItem[method];
                    if (!op) continue;
                    for (const code of Object.keys(op.responses)) {
                        expect(code).toMatch(/^(default|\d{3})$/);
                    }
                }
            }
        });

        it('V3: all response codes should be valid HTTP status codes or default', () => {
            for (const pathKey of Object.keys(specV3.paths)) {
                const pathItem = specV3.paths[pathKey];
                for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
                    const op = pathItem[method];
                    if (!op) continue;
                    for (const code of Object.keys(op.responses)) {
                        expect(code).toMatch(/^(default|\d{3})$/);
                    }
                }
            }
        });
    });

    describe('V3 empty examples', () => {
        it('should not include empty examples objects in response content', () => {
            const response = specV3.paths['/edge/optional'].get!.responses['200'];
            expect(response.content, 'response should have content').toBeDefined();
            const jsonContent = response.content!['application/json'];
            expect(jsonContent, 'response should have application/json content').toBeDefined();
            // examples should either be absent or non-empty
            if (jsonContent!.examples) {
                expect(Object.keys(jsonContent!.examples).length).toBeGreaterThan(0);
            }
        });
    });

    describe('spec structure', () => {
        it('V2: should have swagger version 2.0', () => {
            expect(specV2.swagger).toEqual('2.0');
        });

        it('V3: should have openapi version 3.0.0', () => {
            expect(specV3.openapi).toEqual('3.0.0');
        });

        it('V2: should have info object with title and version', () => {
            expect(specV2.info).toBeDefined();
            expect(specV2.info.title).toBeDefined();
            expect(specV2.info.version).toBeDefined();
        });

        it('V3: should have info object with title and version', () => {
            expect(specV3.info).toBeDefined();
            expect(specV3.info.title).toBeDefined();
            expect(specV3.info.version).toBeDefined();
        });

        it('V3: should have servers array', () => {
            expect(specV3.servers).toBeDefined();
            expect(Array.isArray(specV3.servers)).toBe(true);
        });

        it('V3: should have components object', () => {
            expect(specV3.components).toBeDefined();
            expect(specV3.components.schemas).toBeDefined();
        });
    });
});
