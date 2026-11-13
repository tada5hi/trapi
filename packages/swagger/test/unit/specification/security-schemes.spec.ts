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
import type {
    SecurityDefinition,
    SecurityDefinitions,
    SpecV2,
    SpecV3,
} from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createResponse,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV31Spec, validateV3Spec } from '../../helpers/schema-validator';

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

    describe('HTTP bearer', () => {
        const bearerDefinitions: SecurityDefinitions = {
            bearer: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            described: {
                type: 'http',
                scheme: 'bearer',
                description: 'Token issued by the identity service.',
            },
        };

        const bearerMetadata = createMetadata([
            createController({
                name: 'TokenController',
                paths: ['token'],
                methods: [createMethod({
                    name: 'get',
                    method: 'get',
                    path: '',
                    security: [{ bearer: [] }, { described: [] }],
                })],
            }),
        ]);

        it.each([Version.V3, Version.V3_1, Version.V3_2])('should pass scheme and bearerFormat through in %s', async (version) => {
            const spec = await generateSwagger({
                version,
                metadata: bearerMetadata,
                data: { securityDefinitions: bearerDefinitions },
            });

            expect(spec.components.securitySchemes).toEqual({
                bearer: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                described: {
                    type: 'http',
                    scheme: 'bearer',
                    description: 'Token issued by the identity service.',
                },
            });

            // No OAI schema exists for 3.2 yet; it is validated against the
            // 3.1 one minus that schema's `openapi: 3.1.x` version pattern.
            const result = version === Version.V3 ? validateV3Spec(spec) : validateV31Spec(spec);
            const errors = result.errors.filter((e) => !e.includes('must match pattern'));

            expect(errors, errors.join('\n')).toEqual([]);
        });

        it('should reject bearerFormat on a scheme other than bearer at the type level', () => {
            const definitions: SecurityDefinitions = {
                basic: {
                    type: 'http',
                    scheme: 'basic',
                    // @ts-expect-error bearerFormat exists only with scheme 'bearer'
                    bearerFormat: 'JWT',
                },
                digest: {
                    type: 'http',
                    scheme: 'digest',
                    // @ts-expect-error bearerFormat exists only with scheme 'bearer'
                    bearerFormat: 'JWT',
                },
            };

            expect(Object.keys(definitions)).toEqual(['basic', 'digest']);
        });

        // A cast config must not yield an invalid document: OpenAPI 3 allows
        // `bearerFormat` only beside the bearer scheme.
        it.each([Version.V3, Version.V3_1, Version.V3_2])('should drop bearerFormat from a non-bearer scheme in %s', async (version) => {
            const spec = await generateSwagger({
                version,
                metadata: bearerMetadata,
                data: {
                    securityDefinitions: {
                        bearer: {
                            type: 'http',
                            scheme: 'basic',
                            bearerFormat: 'JWT',
                        } as unknown as SecurityDefinition,
                        // HTTP scheme names are case-insensitive: typed, no cast.
                        described: {
                            type: 'http',
                            scheme: 'Bearer',
                            bearerFormat: 'JWT',
                        },
                    },
                },
            });

            expect(spec.components.securitySchemes).toEqual({
                bearer: { type: 'http', scheme: 'basic' },
                described: {
                    type: 'http',
                    scheme: 'Bearer',
                    bearerFormat: 'JWT',
                },
            });

            const result = version === Version.V3 ? validateV3Spec(spec) : validateV31Spec(spec);
            const errors = result.errors.filter((e) => !e.includes('must match pattern'));

            expect(errors, errors.join('\n')).toEqual([]);
        });

        it('should emit a basic scheme in any casing as v2 basic', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: bearerMetadata,
                data: {
                    securityDefinitions: {
                        bearer: { type: 'http', scheme: 'Basic' },
                        described: { type: 'http', scheme: 'BASIC' },
                    },
                },
            });

            expect(spec.securityDefinitions).toEqual({
                bearer: { type: 'basic' },
                described: { type: 'basic' },
            });
            expect(validateV2Spec(spec).errors).toEqual([]);
        });

        // Swagger 2.0 knows no `http` type besides `basic`. Dropping the scheme
        // would leave every operation requiring an undefined definition, so it
        // becomes an API key in the `Authorization` header.
        it('should emit a bearer scheme as an Authorization header API key in v2', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: bearerMetadata,
                data: { securityDefinitions: bearerDefinitions },
            });

            expect(spec.securityDefinitions).toEqual({
                bearer: {
                    type: 'apiKey',
                    name: 'Authorization',
                    in: 'header',
                    description: 'HTTP bearer authentication: send "Authorization: Bearer <JWT>".',
                },
                described: {
                    type: 'apiKey',
                    name: 'Authorization',
                    in: 'header',
                    description: 'Token issued by the identity service.',
                },
            });
            expect(validateV2Spec(spec).errors).toEqual([]);
        });
    });
});
