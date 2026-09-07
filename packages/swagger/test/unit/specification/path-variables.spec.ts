/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { SpecV2, SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createResponse,
    integerType,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV3Spec } from '../../helpers/schema-validator';

const servers = [{ url: '/' }];

// `realmId` only exists in one controller mount and is deliberately not a
// decorated argument — a middleware resolves it and the handler reads it off
// the request context, so nothing declares it.
function buildMetadata() {
    return createMetadata([
        createController({
            name: 'UserController',
            paths: ['users', 'realms/:realmId/users'],
            methods: [
                createMethod({
                    name: 'getMany',
                    method: 'get',
                    path: '',
                    responses: [createResponse({ status: '200' })],
                }),
                createMethod({
                    name: 'getOne',
                    method: 'get',
                    path: ':id',
                    parameters: [
                        createParameter({
                            name: 'id',
                            in: 'path',
                            type: integerType(),
                            description: 'The user id.',
                        }),
                    ],
                    responses: [createResponse({ status: '200' })],
                }),
            ],
        }),
    ]);
}

const pathParams = (op: any) => (op.parameters ?? []).filter((p: any) => p.in === 'path');
const names = (op: any) => pathParams(op).map((p: any) => p.name).sort();

describe('undeclared path-template variables (#896)', () => {
    describe('V3', () => {
        async function build() {
            return await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(),
                data: { servers },
            }) as SpecV3;
        }

        it('declares a controller-path variable that no parameter declared', async () => {
            const spec = await build();

            expect(names(spec.paths['/realms/{realmId}/users'].get!)).toEqual(['realmId']);
        });

        it('declares it alongside the parameters the method did declare', async () => {
            const spec = await build();

            expect(names(spec.paths['/realms/{realmId}/users/{id}'].get!)).toEqual(['id', 'realmId']);
        });

        it('marks the synthesized parameter required with a string schema', async () => {
            const spec = await build();

            const realmId = pathParams(spec.paths['/realms/{realmId}/users'].get!)
                .find((p: any) => p.name === 'realmId');

            expect(realmId).toEqual({
                name: 'realmId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
            });
        });

        it('leaves a declared parameter untouched', async () => {
            const spec = await build();

            const id = pathParams(spec.paths['/users/{id}'].get!)
                .find((p: any) => p.name === 'id');

            expect(id.description).toEqual('The user id.');
            expect(id.schema.type).toEqual('integer');
        });

        it('does not synthesize anything for a mount without the variable', async () => {
            const spec = await build();

            expect(names(spec.paths['/users'].get!)).toEqual([]);
            expect(names(spec.paths['/users/{id}'].get!)).toEqual(['id']);
        });

        it('declares a method-path variable that no parameter declared', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'FileController',
                    paths: ['files'],
                    methods: [
                        createMethod({
                            name: 'download',
                            method: 'get',
                            path: ':bucket/:key',
                            responses: [createResponse({ status: '200' })],
                        }),
                    ],
                }),
            ]);

            const spec = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            }) as SpecV3;

            expect(names(spec.paths['/files/{bucket}/{key}'].get!)).toEqual(['bucket', 'key']);
        });
    });

    describe('V2', () => {
        async function build() {
            return await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(),
                data: { servers },
            }) as SpecV2;
        }

        it('declares a controller-path variable that no parameter declared', async () => {
            const spec = await build();

            expect(names(spec.paths['/realms/{realmId}/users'].get!)).toEqual(['realmId']);
        });

        it('marks the synthesized parameter required with a string type', async () => {
            const spec = await build();

            const realmId = pathParams(spec.paths['/realms/{realmId}/users'].get!)
                .find((p: any) => p.name === 'realmId');

            expect(realmId).toEqual({
                name: 'realmId',
                in: 'path',
                required: true,
                type: 'string',
            });
        });

        it('leaves a declared parameter untouched', async () => {
            const spec = await build();

            const id = pathParams(spec.paths['/users/{id}'].get!)
                .find((p: any) => p.name === 'id');

            expect(id.description).toEqual('The user id.');
            expect(id.type).toEqual('integer');
        });
    });

    describe('schema compliance', () => {
        it('V2: the document with synthesized parameters validates', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(),
                data: { servers },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it('V3: the document with synthesized parameters validates', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(),
                data: { servers },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });
    });
});
