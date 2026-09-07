/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { PathParameterOption, SpecV2, SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createResponse,
    integerType,
    stringType,
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

const params = (op: any) => (op.parameters ?? []);
const pathParams = (op: any) => params(op).filter((p: any) => p.in === 'path');
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

const REALM_ID_DESCRIPTION = 'The realm, addressed by id or by name.';
const ID_DESCRIPTION = 'The user id, as a UUID.';

// `id` carries no description of its own here — `createParameter` defaults it to
// the empty string, which is what a decorated argument without a JSDoc comment
// produces.
function buildMetadataWithUndocumentedId() {
    return createMetadata([
        createController({
            name: 'UserController',
            paths: ['users'],
            methods: [
                createMethod({
                    name: 'getOne',
                    method: 'get',
                    path: ':id',
                    parameters: [
                        createParameter({
                            name: 'id',
                            in: 'path',
                            type: integerType(),
                        }),
                    ],
                    responses: [createResponse({ status: '200' })],
                }),
            ],
        }),
    ]);
}

// `realmId` is a *query* parameter here and appears in no path template, so a
// `pathParameters` entry keyed on it must find nothing to describe. The source
// is `queryProp` because that is the one the emitters actually emit — plain
// `query` is the object-decomposition marker and is skipped.
function buildMetadataWithRealmIdQuery() {
    return createMetadata([
        createController({
            name: 'UserController',
            paths: ['users'],
            methods: [
                createMethod({
                    name: 'getMany',
                    method: 'get',
                    path: '',
                    parameters: [
                        createParameter({
                            name: 'realmId',
                            in: 'queryProp',
                            type: stringType(),
                            required: false,
                        }),
                    ],
                    responses: [createResponse({ status: '200' })],
                }),
            ],
        }),
    ]);
}

describe('data.pathParameters (#913)', () => {
    describe('V3', () => {
        async function build(pathParameters?: Record<string, PathParameterOption>) {
            return await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(),
                data: { servers, pathParameters },
            }) as SpecV3;
        }

        it('describes a synthesized path variable', async () => {
            const spec = await build({ realmId: { description: REALM_ID_DESCRIPTION } });

            const realmId = pathParams(spec.paths['/realms/{realmId}/users'].get!)
                .find((p: any) => p.name === 'realmId');

            expect(realmId).toEqual({
                name: 'realmId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
                description: REALM_ID_DESCRIPTION,
            });
        });

        it('describes the synthesized variable on every operation it appears on', async () => {
            const spec = await build({ realmId: { description: REALM_ID_DESCRIPTION } });

            const realmId = pathParams(spec.paths['/realms/{realmId}/users/{id}'].get!)
                .find((p: any) => p.name === 'realmId');

            expect(realmId).toEqual({
                name: 'realmId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
                description: REALM_ID_DESCRIPTION,
            });
        });

        it('omits the description key entirely when nothing is configured', async () => {
            const spec = await build();

            const realmId = pathParams(spec.paths['/realms/{realmId}/users'].get!)
                .find((p: any) => p.name === 'realmId');

            expect(realmId).not.toHaveProperty('description');
        });

        it('lets a declared description win over the configured one', async () => {
            const spec = await build({ id: { description: 'SHOULD NOT WIN' } });

            const id = pathParams(spec.paths['/users/{id}'].get!)
                .find((p: any) => p.name === 'id');

            expect(id.description).toEqual('The user id.');
            expect(id.schema.type).toEqual('integer');
        });

        it('fills in a declared path parameter whose description is empty', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadataWithUndocumentedId(),
                data: { servers, pathParameters: { id: { description: ID_DESCRIPTION } } },
            }) as SpecV3;

            const id = pathParams(spec.paths['/users/{id}'].get!)
                .find((p: any) => p.name === 'id');

            expect(id.description).toEqual(ID_DESCRIPTION);
            expect(id.schema.type).toEqual('integer');
        });

        it('leaves an undocumented declared parameter untouched when nothing is configured', async () => {
            // The option must not change a document that does not use it: an empty
            // declared description stays `''` rather than dropping the key.
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadataWithUndocumentedId(),
                data: { servers },
            }) as SpecV3;

            const id = pathParams(spec.paths['/users/{id}'].get!)
                .find((p: any) => p.name === 'id');

            expect(id.in).toEqual('path');
            expect(id.description).toEqual('');
        });

        it('is inert for a name that matches no path variable', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadataWithRealmIdQuery(),
                data: { servers, pathParameters: { realmId: { description: 'SHOULD NOT LEAK' } } },
            }) as SpecV3;

            const operation = spec.paths['/users'].get!;

            expect(names(operation)).toEqual([]);

            const realmId = params(operation)
                .find((p: any) => p.name === 'realmId');

            expect(realmId.in).toEqual('query');
            expect(realmId.description).toEqual('');
        });
    });

    describe('V2', () => {
        async function build(pathParameters?: Record<string, PathParameterOption>) {
            return await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(),
                data: { servers, pathParameters },
            }) as SpecV2;
        }

        it('describes a synthesized path variable', async () => {
            const spec = await build({ realmId: { description: REALM_ID_DESCRIPTION } });

            const realmId = pathParams(spec.paths['/realms/{realmId}/users'].get!)
                .find((p: any) => p.name === 'realmId');

            expect(realmId).toEqual({
                name: 'realmId',
                in: 'path',
                required: true,
                type: 'string',
                description: REALM_ID_DESCRIPTION,
            });
        });

        it('describes the synthesized variable on every operation it appears on', async () => {
            const spec = await build({ realmId: { description: REALM_ID_DESCRIPTION } });

            const realmId = pathParams(spec.paths['/realms/{realmId}/users/{id}'].get!)
                .find((p: any) => p.name === 'realmId');

            expect(realmId).toEqual({
                name: 'realmId',
                in: 'path',
                required: true,
                type: 'string',
                description: REALM_ID_DESCRIPTION,
            });
        });

        it('omits the description key entirely when nothing is configured', async () => {
            const spec = await build();

            const realmId = pathParams(spec.paths['/realms/{realmId}/users'].get!)
                .find((p: any) => p.name === 'realmId');

            expect(realmId).not.toHaveProperty('description');
        });

        it('lets a declared description win over the configured one', async () => {
            const spec = await build({ id: { description: 'SHOULD NOT WIN' } });

            const id = pathParams(spec.paths['/users/{id}'].get!)
                .find((p: any) => p.name === 'id');

            expect(id.description).toEqual('The user id.');
            expect(id.type).toEqual('integer');
        });

        it('fills in a declared path parameter whose description is empty', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadataWithUndocumentedId(),
                data: { servers, pathParameters: { id: { description: ID_DESCRIPTION } } },
            }) as SpecV2;

            const id = pathParams(spec.paths['/users/{id}'].get!)
                .find((p: any) => p.name === 'id');

            expect(id.description).toEqual(ID_DESCRIPTION);
            expect(id.type).toEqual('integer');
        });

        it('leaves an undocumented declared parameter untouched when nothing is configured', async () => {
            // The option must not change a document that does not use it: an empty
            // declared description stays `''` rather than dropping the key.
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadataWithUndocumentedId(),
                data: { servers },
            }) as SpecV2;

            const id = pathParams(spec.paths['/users/{id}'].get!)
                .find((p: any) => p.name === 'id');

            expect(id.in).toEqual('path');
            expect(id.description).toEqual('');
        });

        it('is inert for a name that matches no path variable', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadataWithRealmIdQuery(),
                data: { servers, pathParameters: { realmId: { description: 'SHOULD NOT LEAK' } } },
            }) as SpecV2;

            const operation = spec.paths['/users'].get!;

            expect(names(operation)).toEqual([]);

            const realmId = params(operation)
                .find((p: any) => p.name === 'realmId');

            expect(realmId.in).toEqual('query');
            expect(realmId.description).toEqual('');
        });
    });

    describe('schema compliance', () => {
        const pathParameters = {
            realmId: { description: REALM_ID_DESCRIPTION },
            id: { description: ID_DESCRIPTION },
        };

        it('V2: the described document validates', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(),
                data: { servers, pathParameters },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it('V3: the described document validates', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(),
                data: { servers, pathParameters },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });
    });
});
