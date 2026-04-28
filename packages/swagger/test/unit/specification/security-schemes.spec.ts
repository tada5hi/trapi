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
import type { SecurityDefinitions, SpecV2, SpecV3  } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createResponse,
} from '../../helpers/metadata-builder';

describe('security schemes', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const securityDefinitions: SecurityDefinitions = {
        bearerAuth: {
            type: 'http',
            scheme: 'basic',
        },
        apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
        },
        apiKeyQuery: {
            type: 'apiKey',
            name: 'api_key',
            in: 'query',
        },
        oauth2: {
            type: 'oauth2',
            flows: {
                implicit: {
                    authorizationUrl: 'https://auth.example.com/authorize',
                    scopes: { read: 'Read access', write: 'Write access' },
                },
                password: {
                    tokenUrl: 'https://auth.example.com/token',
                    scopes: { admin: 'Admin access' },
                },
                authorizationCode: {
                    authorizationUrl: 'https://auth.example.com/authorize',
                    tokenUrl: 'https://auth.example.com/token',
                    scopes: { read: 'Read access' },
                },
                clientCredentials: {
                    tokenUrl: 'https://auth.example.com/token',
                    scopes: { service: 'Service access' },
                },
            },
        },
    };

    const metadata = createMetadata(
        [
            createController({
                name: 'SecureController',
                paths: ['secure'],
                security: [{ bearerAuth: [] }],
                methods: [
                    createMethod({
                        name: 'publicEndpoint',
                        method: 'get',
                        path: 'public',
                        security: [],
                        responses: [createResponse({ status: '200', description: 'Ok' })],
                    }),
                    createMethod({
                        name: 'protectedEndpoint',
                        method: 'get',
                        path: 'protected',
                        security: [{ bearerAuth: [] }],
                        responses: [createResponse({ status: '200', description: 'Ok' })],
                    }),
                    createMethod({
                        name: 'multiAuthEndpoint',
                        method: 'get',
                        path: 'multi',
                        security: [{ bearerAuth: [], apiKey: [] }],
                        responses: [createResponse({ status: '200', description: 'Ok' })],
                    }),
                    createMethod({
                        name: 'eitherAuthEndpoint',
                        method: 'get',
                        path: 'either',
                        security: [{ bearerAuth: [] }, { apiKey: [] }],
                        responses: [createResponse({ status: '200', description: 'Ok' })],
                    }),
                ],
            }),
        ],
    );

    beforeAll(async () => {
        specV2 = await generateSwagger({
            version: Version.V2,
            metadata,
            data: {
                servers: 'http://localhost:3000/',
                securityDefinitions,
            },
        });

        specV3 = await generateSwagger({
            version: Version.V3,
            metadata,
            data: {
                servers: 'http://localhost:3000/',
                securityDefinitions,
            },
        });
    });

    describe('V2 - securityDefinitions', () => {
        it('should translate HTTP basic to V2 basic type', () => {
            expect(specV2.securityDefinitions).toBeDefined();
            expect(specV2.securityDefinitions!.bearerAuth).toEqual({ type: 'basic' });
        });

        it('should pass through API key security', () => {
            expect(specV2.securityDefinitions!.apiKey).toEqual({
                type: 'apiKey',
                name: 'X-API-Key',
                in: 'header',
            });
        });

        it('should pass through API key in query', () => {
            expect(specV2.securityDefinitions!.apiKeyQuery).toEqual({
                type: 'apiKey',
                name: 'api_key',
                in: 'query',
            });
        });

        it('should translate OAuth2 implicit flow', () => {
            expect(specV2.securityDefinitions!.oauth2Implicit).toBeDefined();
            const def = specV2.securityDefinitions!.oauth2Implicit as any;
            expect(def.type).toEqual('oauth2');
            expect(def.flow).toEqual('implicit');
            expect(def.authorizationUrl).toEqual('https://auth.example.com/authorize');
            expect(def.scopes).toEqual({ read: 'Read access', write: 'Write access' });
        });

        it('should translate OAuth2 password flow', () => {
            expect(specV2.securityDefinitions!.oauth2Password).toBeDefined();
            const def = specV2.securityDefinitions!.oauth2Password as any;
            expect(def.type).toEqual('oauth2');
            expect(def.flow).toEqual('password');
            expect(def.tokenUrl).toEqual('https://auth.example.com/token');
            expect(def.scopes).toEqual({ admin: 'Admin access' });
        });

        it('should translate OAuth2 authorization code as accessCode', () => {
            expect(specV2.securityDefinitions!.oauth2AccessCode).toBeDefined();
            const def = specV2.securityDefinitions!.oauth2AccessCode as any;
            expect(def.type).toEqual('oauth2');
            expect(def.flow).toEqual('accessCode');
            expect(def.tokenUrl).toEqual('https://auth.example.com/token');
            expect(def.authorizationUrl).toEqual('https://auth.example.com/authorize');
        });

        it('should translate OAuth2 client credentials as application', () => {
            expect(specV2.securityDefinitions!.oauth2Application).toBeDefined();
            const def = specV2.securityDefinitions!.oauth2Application as any;
            expect(def.type).toEqual('oauth2');
            expect(def.flow).toEqual('application');
        });
    });

    describe('V2 - operation security', () => {
        it('should set security on protected endpoint', () => {
            const op = specV2.paths['/secure/protected'].get!;
            expect(op.security).toEqual([{ bearerAuth: [] }]);
        });

        it('should support AND security (multiple schemes in one object)', () => {
            const op = specV2.paths['/secure/multi'].get!;
            expect(op.security).toEqual([{ bearerAuth: [], apiKey: [] }]);
        });

        it('should support OR security (multiple objects)', () => {
            const op = specV2.paths['/secure/either'].get!;
            expect(op.security).toEqual([{ bearerAuth: [] }, { apiKey: [] }]);
        });
    });

    describe('V3 - components/securitySchemes', () => {
        it('should pass through HTTP security scheme', () => {
            const scheme = specV3.components.securitySchemes!.bearerAuth as any;
            expect(scheme).toBeDefined();
            expect(scheme.type).toEqual('http');
            expect(scheme.scheme).toEqual('basic');
        });

        it('should pass through API key security', () => {
            const scheme = specV3.components.securitySchemes!.apiKey as any;
            expect(scheme.type).toEqual('apiKey');
            expect(scheme.name).toEqual('X-API-Key');
            expect(scheme.in).toEqual('header');
        });

        it('should pass through OAuth2 with flows', () => {
            const scheme = specV3.components.securitySchemes!.oauth2 as any;
            expect(scheme.type).toEqual('oauth2');
            expect(scheme.flows).toBeDefined();
            expect(scheme.flows.implicit).toBeDefined();
            expect(scheme.flows.password).toBeDefined();
            expect(scheme.flows.authorizationCode).toBeDefined();
            expect(scheme.flows.clientCredentials).toBeDefined();
        });
    });

    describe('V3 - operation security', () => {
        it('should set security on protected endpoint', () => {
            const op = specV3.paths['/secure/protected'].get!;
            expect(op.security).toEqual([{ bearerAuth: [] }]);
        });

        it('should support AND security', () => {
            const op = specV3.paths['/secure/multi'].get!;
            expect(op.security).toEqual([{ bearerAuth: [], apiKey: [] }]);
        });

        it('should support OR security', () => {
            const op = specV3.paths['/secure/either'].get!;
            expect(op.security).toEqual([{ bearerAuth: [] }, { apiKey: [] }]);
        });
    });
});
