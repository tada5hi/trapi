/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Metadata, NestedObjectLiteralType, RefEnumType } from '@trapi/core';
import { describe, expect, it } from 'vitest';
import type {
    BaseSchema,
    BodyParameterV2,
    SchemaV2,
    SchemaV3,
    SpecV2,
    SpecV3,
} from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createProperty,
    createRefEnum,
    createRefObject,
    createResponse,
    refEnumType,
    refObjectType,
    stringType,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV3Spec } from '../../helpers/schema-validator';

const servers = [{ url: '/' }];

function emptyBodyType() : NestedObjectLiteralType {
    return {
        typeName: 'nestedObjectLiteral',
        properties: [],
    };
}

function statusType() : RefEnumType {
    return refEnumType('Status', ['active', 'inactive']);
}

/**
 * A controller mounted twice, so the emitter runs `buildOperation` twice against
 * the *same* `Method` object.
 *
 * - `create` carries an explicit empty `body` plus a `bodyProp`, the pair the V3
 *   emitter merges. The merge used to `push` into the metadata's own nested
 *   object literal, so the second mount saw the property twice.
 * - `list` carries a `$ref`-typed non-body parameter. Swagger 2.0 has nowhere to
 *   put a `$ref` on a non-body parameter, and the V2 emitter used to flatten it
 *   by rewriting `parameter.type` on the metadata itself.
 */
function buildMetadata() : Metadata {
    return createMetadata(
        [
            createController({
                name: 'UserController',
                paths: ['users', 'realms/:realmId/users'],
                methods: [
                    createMethod({
                        name: 'create',
                        method: 'post',
                        path: '',
                        parameters: [
                            createParameter({
                                name: 'body',
                                in: 'body',
                                type: emptyBodyType(),
                            }),
                            createParameter({
                                name: 'name',
                                in: 'bodyProp',
                                type: stringType(),
                            }),
                        ],
                        responses: [createResponse({ status: '201' })],
                    }),
                    createMethod({
                        name: 'list',
                        method: 'get',
                        path: '',
                        parameters: [
                            createParameter({
                                name: 'status',
                                in: 'queryProp',
                                type: statusType(),
                            }),
                        ],
                        responses: [createResponse({ status: '200' })],
                    }),
                ],
            }),
        ],
        { Status: createRefEnum('Status', ['active', 'inactive']) },
    );
}

/**
 * The same multi-mount shape, but with no explicit `body` parameter — the
 * emitter synthesizes one from the `bodyProp` alone.
 */
function buildBodyPropOnlyMetadata() : Metadata {
    return createMetadata([
        createController({
            name: 'UserController',
            paths: ['users', 'realms/:realmId/users'],
            methods: [
                createMethod({
                    name: 'create',
                    method: 'post',
                    path: '',
                    parameters: [
                        createParameter({
                            name: 'name',
                            in: 'bodyProp',
                            type: stringType(),
                        }),
                    ],
                    responses: [createResponse({ status: '201' })],
                }),
            ],
        }),
    ]);
}

/**
 * The body type already declares `name` required, and a `@BodyProp` names it too.
 * Swagger 2.0's `required` is draft-04's `stringArray` — `uniqueItems: true` — so
 * the two lists have to be merged, not concatenated.
 */
function buildOverlappingRequirednessMetadata() : Metadata {
    return createMetadata([
        createController({
            name: 'UserController',
            paths: ['users'],
            methods: [
                createMethod({
                    name: 'create',
                    method: 'post',
                    path: '',
                    parameters: [
                        createParameter({
                            name: 'body',
                            in: 'body',
                            type: {
                                typeName: 'nestedObjectLiteral',
                                properties: [
                                    createProperty({
                                        name: 'name', 
                                        type: stringType(), 
                                        required: true, 
                                    }),
                                ],
                            },
                        }),
                        createParameter({
                            name: 'name', 
                            in: 'bodyProp', 
                            type: stringType(), 
                        }),
                    ],
                    responses: [createResponse({ status: '201' })],
                }),
            ],
        }),
    ]);
}

/**
 * A body parameter whose declared type is a named `refObject` rather than an
 * inline object literal. There is no schema to splice properties into, so V2
 * flattens the reference through `referenceTypes` — both halves' requiredness
 * has to survive, deduped.
 */
function buildRefObjectBodyMetadata() : Metadata {
    return createMetadata([
        createController({
            name: 'UserController',
            paths: ['users'],
            methods: [
                createMethod({
                    name: 'create',
                    method: 'post',
                    path: '',
                    parameters: [
                        createParameter({
                            name: 'body', 
                            in: 'body', 
                            type: refObjectType('User'), 
                        }),
                        createParameter({
                            name: 'name', 
                            in: 'bodyProp', 
                            type: stringType(), 
                        }),
                    ],
                    responses: [createResponse({ status: '201' })],
                }),
            ],
        }),
    ], { User: createRefObject('User', [createProperty({ name: 'id', type: stringType() })]) });
}

/**
 * A single-mount controller whose explicit empty `body` is merged with one
 * required and one optional `bodyProp` — the pair that separates the parameter's
 * own `required` flag from the emitted schema's `required` array.
 */
function buildMergedRequirednessMetadata(nameRequired: boolean) : Metadata {
    return createMetadata([
        createController({
            name: 'UserController',
            paths: ['users'],
            methods: [
                createMethod({
                    name: 'create',
                    method: 'post',
                    path: '',
                    parameters: [
                        createParameter({
                            name: 'body',
                            in: 'body',
                            type: emptyBodyType(),
                        }),
                        createParameter({
                            name: 'name',
                            in: 'bodyProp',
                            type: stringType(),
                            required: nameRequired,
                        }),
                        createParameter({
                            name: 'nickname',
                            in: 'bodyProp',
                            type: stringType(),
                            required: false,
                        }),
                    ],
                    responses: [createResponse({ status: '201' })],
                }),
            ],
        }),
    ]);
}

const MOUNTS = ['/users', '/realms/{realmId}/users'];

function requestBodySchema(spec: SpecV3, path: string) : SchemaV3 {
    return spec.paths[path]!.post!.requestBody!.content['application/json']!.schema!;
}

/**
 * The single body parameter of the `post` operation at `path`. The assertions are
 * part of the lookup on purpose — a `find` that returned `undefined` for a moved
 * parameter would turn every caller into a silent pass.
 */
function bodyParameterSchema(spec: SpecV2, path: string) : BaseSchema<SchemaV2> {
    const parameters = spec.paths[path]!.post!.parameters!;
    expect(parameters).toHaveLength(1);

    const parameter = parameters[0] as BodyParameterV2;
    expect(parameter.in).toEqual('body');
    expect(parameter.name).toEqual('body');

    return parameter.schema;
}

describe('metadata immutability', () => {
    describe('body + bodyProp merge across mounts (V3)', () => {
        it('merges each bodyProp exactly once per emitted operation', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(),
                data: { servers },
            });

            for (const mount of MOUNTS) {
                const schema = requestBodySchema(spec, mount);

                expect(schema.type).toEqual('object');
                expect(Object.keys(schema.properties!)).toEqual(['name']);
                expect(schema.properties!.name).toEqual({
                    type: 'string',
                    description: '',
                });
                // `uniqueItems: true` — a repeated entry is not merely ugly, it is
                // an invalid JSON Schema `required` array.
                expect(schema.required).toEqual(['name']);
            }
        });

        it('leaves the body parameter of the metadata empty', async () => {
            const metadata = buildMetadata();

            await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });

            const bodyParameter = metadata.controllers[0]!.methods[0]!.parameters[0]!;
            expect(bodyParameter.name).toEqual('body');
            expect(bodyParameter.type.typeName).toEqual('nestedObjectLiteral');

            const bodyType = bodyParameter.type as NestedObjectLiteralType;
            expect(bodyType.properties).toEqual([]);
        });
    });

    describe('emission does not mutate the metadata', () => {
        // The whole document, not a hand-picked subtree: the controller cascade
        // writes `consumes`, `produces`, `tags`, `security`, `deprecated` and
        // `responses` back onto every `Method`, and each of those is a place a
        // future emitter could leak into the next document.
        it('holds for V3', async () => {
            const metadata = buildMetadata();
            const before = JSON.stringify(metadata);

            await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });

            expect(JSON.stringify(metadata)).toEqual(before);
        });

        it('holds for V2', async () => {
            const metadata = buildMetadata();
            const before = JSON.stringify(metadata);

            await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });

            expect(JSON.stringify(metadata)).toEqual(before);
        });

        it('leaves a $ref-typed non-body parameter a reference after V2', async () => {
            const metadata = buildMetadata();

            await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });

            const queryParameter = metadata.controllers[0]!.methods[1]!.parameters[0]!;
            expect(queryParameter.name).toEqual('status');
            expect(queryParameter.type.typeName).toEqual('refEnum');

            const queryType = queryParameter.type as RefEnumType;
            expect(queryType.refName).toEqual('Status');
            expect(queryType.members).toEqual(['active', 'inactive']);
        });
    });

    describe('repeated emission from one Metadata object', () => {
        it('emits a byte-identical document for V3 after V3', async () => {
            const metadata = buildMetadata();

            const first = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });
            const second = await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });

            expect(JSON.stringify(second)).toEqual(JSON.stringify(first));
        });

        it('emits a byte-identical document for V3 after V2', async () => {
            const alone = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(),
                data: { servers },
            });

            const shared = buildMetadata();
            await generateSwagger({
                version: Version.V2,
                metadata: shared,
                data: { servers },
            });
            const afterV2 = await generateSwagger({
                version: Version.V3,
                metadata: shared,
                data: { servers },
            });

            // The parameter whose `$ref` a preceding V2 emission used to erase.
            expect(afterV2.paths['/users']!.get!.parameters![0]).toEqual(
                expect.objectContaining({
                    name: 'status',
                    in: 'query',
                    schema: { $ref: '#/components/schemas/Status' },
                }),
            );
            expect(JSON.stringify(afterV2)).toEqual(JSON.stringify(alone));
        });
    });

    // Not multi-mount regression coverage: with no explicit `body` parameter the
    // emitter synthesizes a fresh one inside every `buildOperation` call, so this
    // shape cannot exhibit the merge bug no matter how many mounts it is emitted
    // at. What it pins is the synthesized shape itself, and that synthesizing a
    // body leaves the metadata's own parameter list alone.
    describe('bodyProp-only method (body synthesized per operation)', () => {
        it('emits required: [name] on every mount in V3', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildBodyPropOnlyMetadata(),
                data: { servers },
            });

            for (const mount of MOUNTS) {
                const schema = requestBodySchema(spec, mount);

                expect(schema.type).toEqual('object');
                expect(Object.keys(schema.properties!)).toEqual(['name']);
                expect(schema.properties!.name).toEqual({
                    type: 'string',
                    description: '',
                });
                expect(schema.required).toEqual(['name']);
            }
        });

        it('leaves the metadata without a body parameter', async () => {
            const metadata = buildBodyPropOnlyMetadata();
            const before = JSON.stringify(metadata);

            await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });

            const { parameters } = metadata.controllers[0]!.methods[0]!;
            expect(parameters).toHaveLength(1);
            expect(parameters[0]!.in).toEqual('bodyProp');
            expect(JSON.stringify(metadata)).toEqual(before);
        });
    });

    describe('schema compliance', () => {
        it('emits a valid OpenAPI 3.0 document for the merged body', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(),
                data: { servers },
            });

            expect(validateV3Spec(spec).errors).toEqual([]);
        });

        it('emits a valid OpenAPI 3.0 document for the synthetic body', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildBodyPropOnlyMetadata(),
                data: { servers },
            });

            expect(validateV3Spec(spec).errors).toEqual([]);
        });

        it('emits a valid Swagger 2.0 document for the merged body', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(),
                data: { servers },
            });

            expect(validateV2Spec(spec).errors).toEqual([]);
        });

        it('emits a valid Swagger 2.0 document for the synthetic body', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildBodyPropOnlyMetadata(),
                data: { servers },
            });

            expect(validateV2Spec(spec).errors).toEqual([]);
        });
    });
});

// Shares the body + bodyProp fixtures above, which is why it lives in this file.
// V2 decided requiredness from `bodyProp.required` — the *emitted schema*, where
// `required` is the array of child property names and never a boolean — so the
// branch never ran: every merged `@BodyProp` came out optional, under a
// `required: []` that draft-04's `minItems: 1` rejects outright.
describe('bodyProp requiredness', () => {
    describe('V2 merged body', () => {
        it('lists a required bodyProp in required and omits the optional one', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMergedRequirednessMetadata(true),
                data: { servers },
            });

            const schema = bodyParameterSchema(spec, '/users');
            expect(Object.keys(schema.properties!)).toEqual(['name', 'nickname']);
            expect(schema.required).toEqual(['name']);
        });

        it('omits required entirely when every bodyProp is optional', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMergedRequirednessMetadata(false),
                data: { servers },
            });

            const schema = bodyParameterSchema(spec, '/users');
            expect(Object.keys(schema.properties!)).toEqual(['name', 'nickname']);
            expect(schema).not.toHaveProperty('required');
        });

        it.each([true, false])('validates against Swagger 2.0 (nameRequired: %s)', async (nameRequired) => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMergedRequirednessMetadata(nameRequired),
                data: { servers },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it('lists an overlapping name once rather than twice', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildOverlappingRequirednessMetadata(),
                data: { servers },
            });

            const schema = bodyParameterSchema(spec, '/users');
            expect(schema.required).toEqual(['name']);

            // `uniqueItems: true` on draft-04's `stringArray`, so a repeat is not
            // merely untidy — the document stops validating.
            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it('keeps the required names of both halves when a refObject body is flattened', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildRefObjectBodyMetadata(),
                data: { servers },
            });

            const schema = bodyParameterSchema(spec, '/users');
            expect(Object.keys(schema.properties!)).toEqual(['id', 'name']);
            expect(schema.required).toEqual(['id', 'name']);

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });
    });

    describe('V3 merged body', () => {
        it('lists a required bodyProp in required and omits the optional one', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMergedRequirednessMetadata(true),
                data: { servers },
            });

            const schema = requestBodySchema(spec, '/users');
            expect(Object.keys(schema.properties!)).toEqual(['name', 'nickname']);
            expect(schema.required).toEqual(['name']);
        });

        it('omits required entirely when every bodyProp is optional', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMergedRequirednessMetadata(false),
                data: { servers },
            });

            const schema = requestBodySchema(spec, '/users');
            expect(Object.keys(schema.properties!)).toEqual(['name', 'nickname']);
            expect(schema).not.toHaveProperty('required');
        });

        it.each([true, false])('validates against OpenAPI 3.0 (nameRequired: %s)', async (nameRequired) => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMergedRequirednessMetadata(nameRequired),
                data: { servers },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });
    });
});
