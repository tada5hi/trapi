/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createParameter,
    stringType,
} from '../../helpers/metadata-builder';

const servers = [{ url: '/' }];

describe('operationId', () => {
    describe('default (method strategy)', () => {
        const metadata = createMetadata([
            createController({
                name: 'RolesController',
                paths: ['roles'],
                methods: [createMethod({
                    name: 'list', 
                    method: 'get', 
                    path: '', 
                })],
            }),
            createController({
                name: 'UsersController',
                paths: ['users'],
                methods: [createMethod({
                    name: 'list', 
                    method: 'get', 
                    path: '', 
                })],
            }),
        ]);

        it('V3: derives the id from the method name with a positional suffix', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });

            expect(spec.paths['/roles'].get!.operationId).toEqual('List');
            expect(spec.paths['/users'].get!.operationId).toEqual('List_2');
        });

        it('V2: derives the id from the method name with a positional suffix', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });

            expect(spec.paths['/roles'].get!.operationId).toEqual('List');
            expect(spec.paths['/users'].get!.operationId).toEqual('List_2');
        });
    });

    describe('path strategy', () => {
        it('derives the id from the verb and path, ignoring the method name', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: createMetadata([
                    createController({
                        name: 'RolesController',
                        paths: ['roles'],
                        methods: [createMethod({
                            name: 'getMany', 
                            method: 'get', 
                            path: '', 
                        })],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/roles'].get!.operationId).toEqual('getRoles');
        });

        it('turns a path parameter into a By<Name> segment', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: createMetadata([
                    createController({
                        name: 'RolesController',
                        paths: ['roles'],
                        methods: [
                            createMethod({
                                name: 'get',
                                method: 'get',
                                path: ':id',
                                parameters: [createParameter({
                                    name: 'id', 
                                    in: 'path', 
                                    type: stringType(), 
                                })],
                            }),
                        ],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/roles/{id}'].get!.operationId).toEqual('getRolesById');
        });

        it('does not alias the verb', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: createMetadata([
                    createController({
                        name: 'RolesController',
                        paths: ['roles'],
                        methods: [createMethod({
                            name: 'add', 
                            method: 'post', 
                            path: '', 
                        })],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/roles'].post!.operationId).toEqual('postRoles');
        });

        it('handles a path parameter in the middle of the path', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: createMetadata([
                    createController({
                        name: 'RolesController',
                        paths: ['realms/:realmId/roles'],
                        methods: [
                            createMethod({
                                name: 'getMany',
                                method: 'get',
                                path: '',
                                parameters: [createParameter({
                                    name: 'realmId', 
                                    in: 'path', 
                                    type: stringType(), 
                                })],
                            }),
                        ],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/realms/{realmId}/roles'].get!.operationId).toEqual('getRealmsByRealmIdRoles');
        });

        it('yields the bare verb for the root path', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: createMetadata([
                    createController({
                        name: 'IndexController',
                        paths: [''],
                        methods: [createMethod({
                            name: 'index', 
                            method: 'get', 
                            path: '/', 
                        })],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/'].get!.operationId).toEqual('get');
        });

        it('camel-cases on non-alphanumeric separators', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: createMetadata([
                    createController({
                        name: 'UsersController',
                        paths: ['v1'],
                        methods: [
                            createMethod({
                                name: 'a', 
                                method: 'get', 
                                path: 'user-profile', 
                            }),
                            createMethod({
                                name: 'b', 
                                method: 'get', 
                                path: 'user.settings', 
                            }),
                        ],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/v1/user-profile'].get!.operationId).toEqual('getV1UserProfile');
            expect(spec.paths['/v1/user.settings'].get!.operationId).toEqual('getV1UserSettings');
        });

        it('stays identifier-safe for a leading-digit segment', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: createMetadata([
                    createController({
                        name: 'AuthController',
                        paths: [''],
                        methods: [createMethod({
                            name: 'twoFactor', 
                            method: 'get', 
                            path: '2fa', 
                        })],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/2fa'].get!.operationId).toEqual('get2fa');
        });

        it('lets an explicit method operationId win', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: createMetadata([
                    createController({
                        name: 'RolesController',
                        paths: ['roles'],
                        methods: [
                            createMethod({
                                name: 'getMany',
                                method: 'get',
                                path: '',
                                operationId: 'listRoles',
                            }),
                        ],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/roles'].get!.operationId).toEqual('listRoles');
        });

        it('keeps the numeric suffix as the collision backstop', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: createMetadata([
                    createController({
                        name: 'UsersController',
                        paths: ['users'],
                        methods: [
                            createMethod({
                                name: 'byId',
                                method: 'get',
                                path: ':id',
                                parameters: [createParameter({
                                    name: 'id', 
                                    in: 'path', 
                                    type: stringType(), 
                                })],
                            }),
                            createMethod({
                                name: 'byIdAlt', 
                                method: 'get', 
                                path: 'by-id', 
                            }),
                        ],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/users/{id}'].get!.operationId).toEqual('getUsersById');
            expect(spec.paths['/users/by-id'].get!.operationId).toEqual('getUsersById_2');
        });

        it('V2 honours the path strategy too', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: createMetadata([
                    createController({
                        name: 'RolesController',
                        paths: ['roles'],
                        methods: [
                            createMethod({
                                name: 'getMany', 
                                method: 'get', 
                                path: '', 
                            }),
                            createMethod({
                                name: 'getOne',
                                method: 'get',
                                path: ':id',
                                parameters: [createParameter({
                                    name: 'id', 
                                    in: 'path', 
                                    type: stringType(), 
                                })],
                            }),
                        ],
                    }),
                ]),
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/roles'].get!.operationId).toEqual('getRoles');
            expect(spec.paths['/roles/{id}'].get!.operationId).toEqual('getRolesById');
        });
    });
});
