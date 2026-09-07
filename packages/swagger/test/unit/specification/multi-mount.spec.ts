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
    createResponse,
    stringType,
} from '../../helpers/metadata-builder';

const servers = [{ url: '/' }];

describe('multi-mount controller paths', () => {
    const metadata = createMetadata([
        createController({
            name: 'RolesController',
            paths: ['roles', 'realms/:realmId/roles'],
            methods: [
                createMethod({
                    name: 'list',
                    method: 'get',
                    path: '',
                    responses: [createResponse({ status: '200' })],
                }),
                createMethod({
                    name: 'detail',
                    method: 'get',
                    path: ':id',
                    parameters: [
                        createParameter({
                            name: 'id',
                            in: 'path',
                            type: stringType(),
                        }),
                        // realmId only exists in one of the controller mounts.
                        createParameter({
                            name: 'realmId',
                            in: 'path',
                            type: stringType(),
                        }),
                    ],
                    responses: [createResponse({ status: '200' })],
                }),
            ],
        }),
    ]);

    describe('V3', () => {
        it('emits one path entry per (controllerPath, method) combination', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });
            expect(spec.paths).toHaveProperty('/roles');
            expect(spec.paths).toHaveProperty('/realms/{realmId}/roles');
            expect(spec.paths).toHaveProperty('/roles/{id}');
            expect(spec.paths).toHaveProperty('/realms/{realmId}/roles/{id}');
        });

        it('disambiguates operationId across mounts with a numeric suffix', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });
            const first = spec.paths['/roles'].get!.operationId;
            const second = spec.paths['/realms/{realmId}/roles'].get!.operationId;
            expect(first).toEqual('List');
            expect(second).toEqual('List_2');
        });

        it('yields distinct path-derived ids per mount with no numeric suffix', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/roles'].get!.operationId).toEqual('getRoles');
            expect(spec.paths['/realms/{realmId}/roles'].get!.operationId).toEqual('getRealmsByRealmIdRoles');
            expect(spec.paths['/roles/{id}'].get!.operationId).toEqual('getRolesById');
            expect(spec.paths['/realms/{realmId}/roles/{id}'].get!.operationId).toEqual('getRealmsByRealmIdRolesById');
        });

        it('only emits path-bound parameters that are present in the URL template', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });

            const onlyId = (spec.paths['/roles/{id}'].get!.parameters || [])
                .filter((p) => (p as { in?: string }).in === 'path')
                .map((p) => (p as { name: string }).name);
            expect(onlyId).toEqual(['id']);

            const both = (spec.paths['/realms/{realmId}/roles/{id}'].get!.parameters || [])
                .filter((p) => (p as { in?: string }).in === 'path')
                .map((p) => (p as { name: string }).name);
            expect(both.sort()).toEqual(['id', 'realmId']);
        });
    });

    describe('V2', () => {
        it('emits one path entry per (controllerPath, method) combination', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });
            expect(spec.paths).toHaveProperty('/roles');
            expect(spec.paths).toHaveProperty('/realms/{realmId}/roles');
            expect(spec.paths).toHaveProperty('/roles/{id}');
            expect(spec.paths).toHaveProperty('/realms/{realmId}/roles/{id}');
        });

        it('disambiguates operationId across mounts with a numeric suffix', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });
            const first = spec.paths['/roles'].get!.operationId;
            const second = spec.paths['/realms/{realmId}/roles'].get!.operationId;
            expect(first).toEqual('List');
            expect(second).toEqual('List_2');
        });

        it('yields distinct path-derived ids per mount with no numeric suffix', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers, operationIdStrategy: 'path' },
            });

            expect(spec.paths['/roles'].get!.operationId).toEqual('getRoles');
            expect(spec.paths['/realms/{realmId}/roles'].get!.operationId).toEqual('getRealmsByRealmIdRoles');
            expect(spec.paths['/roles/{id}'].get!.operationId).toEqual('getRolesById');
            expect(spec.paths['/realms/{realmId}/roles/{id}'].get!.operationId).toEqual('getRealmsByRealmIdRolesById');
        });
    });
});
