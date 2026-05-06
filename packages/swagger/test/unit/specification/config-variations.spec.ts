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
    createResponse,
    stringType,
} from '../../helpers/metadata-builder';

const servers = 'http://localhost:3000/';

describe('config variations', () => {
    describe('specificationExtra', () => {
        it('V2: should merge specificationExtra into the spec', async () => {
            const metadata = createMetadata([]);

            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: {
                    servers,
                    extra: {
                        'x-custom-field': 'custom-value',
                        externalDocs: {
                            description: 'External docs',
                            url: 'https://example.com/docs',
                        },
                    },
                },
            });

            expect((spec as Record<string, unknown>)['x-custom-field']).toEqual('custom-value');
            expect(spec.externalDocs).toEqual({
                description: 'External docs',
                url: 'https://example.com/docs',
            });
        });

        it('V3: should merge specificationExtra into the spec', async () => {
            const metadata = createMetadata([]);

            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: {
                    servers,
                    extra: {
                        'x-custom-field': 'v3-custom',
                        externalDocs: {
                            description: 'V3 docs',
                            url: 'https://example.com/v3',
                        },
                    },
                },
            });

            expect((spec as Record<string, unknown>)['x-custom-field']).toEqual('v3-custom');
            expect(spec.externalDocs).toEqual({
                description: 'V3 docs',
                url: 'https://example.com/v3',
            });
        });

        it('V2: specificationExtra should not overwrite core fields', async () => {
            const metadata = createMetadata([]);

            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: {
                    servers,
                    extra: { swagger: '3.0' },
                },
            });

            // Core fields should be preserved (smob merge gives priority to first arg)
            expect(spec.swagger).toEqual('2.0');
        });

        it('V3: specificationExtra should not overwrite core fields', async () => {
            const metadata = createMetadata([]);

            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: {
                    servers,
                    extra: { openapi: '9.9.9' },
                },
            });

            expect(spec.openapi).toEqual('3.0.0');
        });
    });

    describe('collectionFormat', () => {
        const metadata = createMetadata([
            createController({
                name: 'ArrayController',
                paths: ['arrays'],
                methods: [
                    createMethod({
                        name: 'getWithArray',
                        method: 'get',
                        path: '',
                        parameters: [
                            createParameter({
                                name: 'tags',
                                in: 'queryProp',
                                type: arrayType(stringType()),
                            }),
                        ],
                        responses: [createResponse({ status: '200' })],
                    }),
                ],
            }),
        ]);

        it('V2: should default to multi collectionFormat for array query params', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });

            const pathItem = spec.paths['/arrays'];
            expect(pathItem, `paths: ${JSON.stringify(Object.keys(spec.paths))}`).toBeDefined();
            const params = pathItem.get!.parameters!;
            const tagsParam = params.find((p: any) => p.name === 'tags');
            expect(tagsParam).toBeDefined();
            expect((tagsParam as any).collectionFormat).toEqual('multi');
        });

        it('V2: should use configured collectionFormat', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: {
                    servers,
                    collectionFormat: 'csv',
                },
            });

            const pathItem = spec.paths['/arrays'];
            expect(pathItem, `paths: ${JSON.stringify(Object.keys(spec.paths))}`).toBeDefined();
            const params = pathItem.get!.parameters!;
            const tagsParam = params.find((p: any) => p.name === 'tags');
            expect(tagsParam).toBeDefined();
            expect((tagsParam as any).collectionFormat).toEqual('csv');
        });
    });

    describe('info configuration', () => {
        it('should use configured name, version, and description', async () => {
            const metadata = createMetadata([]);

            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: {
                    servers,
                    name: 'My API',
                    version: '2.5.0',
                    description: 'A test API',
                },
            });

            expect(spec.info.title).toEqual('My API');
            expect(spec.info.version).toEqual('2.5.0');
            expect(spec.info.description).toEqual('A test API');
        });

        it('should default name to Documentation and version to 1.0.0', async () => {
            const metadata = createMetadata([]);

            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });

            expect(spec.info.title).toEqual('Documentation');
            expect(spec.info.version).toEqual('1.0.0');
        });
    });
});
