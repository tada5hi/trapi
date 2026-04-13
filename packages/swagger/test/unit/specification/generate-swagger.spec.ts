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
import type { SpecV2, SpecV3 } from '../../../src';
import { Version, generate, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createProperty,
    createRefObject,
    createResponse,
    refObjectType,
    stringType,
} from '../../helpers/metadata-builder';

describe('generateSwagger', () => {
    const referenceTypes = {
        User: createRefObject('User', [
            createProperty({
                name: 'name',
                type: stringType(),
                required: true,
            }),
        ]),
    };

    const metadata = createMetadata([
        createController({
            name: 'UserController',
            path: '/users',
            methods: [
                createMethod({
                    name: 'getUser',
                    method: 'get',
                    path: '/{id}',
                    type: refObjectType('User'),
                    responses: [
                        createResponse({
                            name: '200',
                            status: '200',
                            schema: refObjectType('User'),
                        }),
                    ],
                }),
            ],
        }),
    ], referenceTypes);

    describe('v2', () => {
        it('should return a v2 spec', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            });

            expect(spec).toBeDefined();
            expect((spec as SpecV2).swagger).toEqual('2.0');
        });

        it('should produce the same spec as generate()', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            });

            const legacySpec = await generate({
                version: Version.V2,
                options: {
                    output: false,
                    servers: 'http://localhost:3000/',
                    metadata,
                },
            });

            expect(spec).toEqual(legacySpec);
        });
    });

    describe('v3', () => {
        it('should return a v3 spec', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            });

            expect(spec).toBeDefined();
            expect((spec as SpecV3).openapi).toMatch(/^3\./);
        });

        it('should produce the same spec as generate()', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            });

            const legacySpec = await generate({
                version: Version.V3,
                options: {
                    output: false,
                    servers: 'http://localhost:3000/',
                    metadata,
                },
            });

            expect(spec).toEqual(legacySpec);
        });
    });

    it('should populate spec info from data options', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: {
                name: 'Test API',
                version: '1.0.0',
                description: 'A test API',
                servers: 'http://localhost:3000/',
                consumes: ['application/json'],
                produces: ['application/json'],
            },
        }) as SpecV2;

        expect(spec.info.title).toEqual('Test API');
        expect(spec.info.version).toEqual('1.0.0');
        expect(spec.info.description).toEqual('A test API');
    });
});
