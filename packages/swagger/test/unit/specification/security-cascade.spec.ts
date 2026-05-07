/*
 * Copyright (c) 2026.
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
import type { SecurityDefinitions, SpecV2, SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createResponse,
} from '../../helpers/metadata-builder';

describe('controller -> method security cascade (#832)', () => {
    const securityDefinitions: SecurityDefinitions = {
        bearerAuth: { type: 'http', scheme: 'basic' },
        apiKey: {
            type: 'apiKey', 
            name: 'X-API-Key', 
            in: 'header', 
        },
    };

    describe('controller has security, method has none', () => {
        let specV2: SpecV2;
        let specV3: SpecV3;

        beforeAll(async () => {
            const metadata = createMetadata([
                createController({
                    name: 'SecureController',
                    paths: ['secure'],
                    security: [{ bearerAuth: [] }],
                    methods: [
                        createMethod({
                            name: 'inheritEndpoint',
                            method: 'get',
                            path: 'inherit',
                            security: [],
                            responses: [createResponse({ status: '200', description: 'Ok' })],
                        }),
                    ],
                }),
            ]);

            specV2 = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/', securityDefinitions },
            });

            specV3 = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/', securityDefinitions },
            });
        });

        it('V2 should cascade controller security onto the operation', () => {
            const op = specV2.paths['/secure/inherit'].get!;
            expect(op.security).toEqual([{ bearerAuth: [] }]);
        });

        it('V3 should cascade controller security onto the operation', () => {
            const op = specV3.paths['/secure/inherit'].get!;
            expect(op.security).toEqual([{ bearerAuth: [] }]);
        });
    });

    describe('method has its own security', () => {
        let specV2: SpecV2;
        let specV3: SpecV3;

        beforeAll(async () => {
            const metadata = createMetadata([
                createController({
                    name: 'SecureController',
                    paths: ['secure'],
                    security: [{ bearerAuth: [] }],
                    methods: [
                        createMethod({
                            name: 'overrideEndpoint',
                            method: 'get',
                            path: 'override',
                            security: [{ apiKey: [] }],
                            responses: [createResponse({ status: '200', description: 'Ok' })],
                        }),
                    ],
                }),
            ]);

            specV2 = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/', securityDefinitions },
            });

            specV3 = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/', securityDefinitions },
            });
        });

        it('V2 should use the method security and ignore controller security', () => {
            const op = specV2.paths['/secure/override'].get!;
            expect(op.security).toEqual([{ apiKey: [] }]);
        });

        it('V3 should use the method security and ignore controller security', () => {
            const op = specV3.paths['/secure/override'].get!;
            expect(op.security).toEqual([{ apiKey: [] }]);
        });
    });

    describe('neither controller nor method has security', () => {
        let specV2: SpecV2;
        let specV3: SpecV3;

        beforeAll(async () => {
            const metadata = createMetadata([
                createController({
                    name: 'OpenController',
                    paths: ['open'],
                    security: [],
                    methods: [
                        createMethod({
                            name: 'openEndpoint',
                            method: 'get',
                            path: 'endpoint',
                            security: [],
                            responses: [createResponse({ status: '200', description: 'Ok' })],
                        }),
                    ],
                }),
            ]);

            specV2 = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/', securityDefinitions },
            });

            specV3 = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers: 'http://localhost:3000/', securityDefinitions },
            });
        });

        // Per OpenAPI 3.x: an operation `security: []` explicitly removes any inherited
        // requirement. We must omit the field entirely when no requirement is intended,
        // not emit an empty array.
        it('V2 should omit operation security', () => {
            const op = specV2.paths['/open/endpoint'].get!;
            expect(op.security).toBeUndefined();
        });

        it('V3 should omit operation security', () => {
            const op = specV3.paths['/open/endpoint'].get!;
            expect(op.security).toBeUndefined();
        });
    });
});
