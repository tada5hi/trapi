/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Metadata, 
    RefAliasType, 
    ReferenceTypes, 
    Type,
} from '@trapi/core';
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
    anyType,
    arrayType,
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createProperty,
    createRefAlias,
    createRefObject,
    createResponse,
    intersectionType,
    objectType,
    refObjectType,
    stringType,
    undefinedType,
    unionType,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV3Spec } from '../../helpers/schema-validator';

const servers = [{ url: '/' }];

const USER_REFERENCE_TYPES : ReferenceTypes = {
    User: createRefObject('User', [
        createProperty({ name: 'id', type: stringType() }),
    ]),
};

/**
 * The same `User`, but every annotation a property can carry — plus a
 * `string | undefined` property declared `required`, which the model's own
 * `definitions` entry reports optional. The flattened body has to agree with the
 * definition on both counts.
 */
const ANNOTATED_REFERENCE_TYPES : ReferenceTypes = {
    User: createRefObject(
        'User',
        [
            createProperty({
                name: 'id',
                type: stringType(),
                description: 'the id',
                deprecated: true,
                validators: { minLength: { value: 3 } },
                extensions: [{ key: 'x-foo', value: 1 }],
            }),
            createProperty({
                name: 'nick',
                type: unionType([stringType(), undefinedType()]),
            }),
        ],
        { description: 'A user model', example: { id: 'abc' } },
    ),
};

/**
 * `type UserDto = { id: string }` — what the resolver emits for the ordinary
 * alias idiom is a `refAlias` wrapping a `nestedObjectLiteral`, not a
 * `refObject`.
 */
function refAliasBodyType() : RefAliasType {
    return createRefAlias('UserDto', {
        typeName: 'nestedObjectLiteral',
        properties: [createProperty({ name: 'id', type: stringType() })],
    });
}

const USER_DTO_REFERENCE_TYPES : ReferenceTypes = { UserDto: refAliasBodyType() };

/**
 * `type A = B; type B = A` — TypeScript rejects it (TS2456), so `@trapi/metadata`
 * cannot emit one, but `generateSwagger` takes `Metadata` from any producer. Both
 * emitters have to answer with the typed error rather than blowing the stack.
 */
function cyclicAliasBodyType() : RefAliasType {
    const a = createRefAlias('A', stringType());
    a.type = createRefAlias('B', a);

    return a;
}

/**
 * One `POST` carrying an explicit `@Body` of `bodyType` plus a single
 * `@BodyProp('name')`. Neither half may be dropped: #923 had V2 discard the
 * declared body type and V3 discard every `@BodyProp` for the very same input.
 */
function buildMetadata(bodyType: Type, referenceTypes: ReferenceTypes = {}) : Metadata {
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
                            type: bodyType,
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
    ], referenceTypes);
}

function requestBodySchema(spec: SpecV3) : SchemaV3 {
    return spec.paths['/users']!.post!.requestBody!.content['application/json']!.schema!;
}

function bodyParameterSchema(spec: SpecV2) : BaseSchema<SchemaV2> {
    const parameters = spec.paths['/users']!.post!.parameters!;
    expect(parameters).toHaveLength(1);

    const parameter = parameters[0] as BodyParameterV2;
    expect(parameter.in).toEqual('body');
    expect(parameter.name).toEqual('body');

    return parameter.schema;
}

// The properties object both emitters build from the single `@BodyProp('name')`.
const BODY_PROP_MEMBER = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            description: '',
        },
    },
    required: ['name'],
};

describe('body + bodyProp on a non-object-literal body', () => {
    describe('V3', () => {
        it('composes a refObject body with the bodyProp properties via allOf', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(refObjectType('User'), USER_REFERENCE_TYPES),
                data: { servers },
            });

            const schema = requestBodySchema(spec);

            // `allOf` is the whole schema — a `$ref` sibling would be invalid in 3.0.
            expect(Object.keys(schema)).toEqual(['allOf']);
            expect(schema.allOf).toHaveLength(2);
            expect(schema.allOf![0]).toEqual({ $ref: '#/components/schemas/User' });
            expect(schema.allOf![1]).toEqual(BODY_PROP_MEMBER);
        });

        it('composes a refAlias body with the bodyProp properties via allOf', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(refAliasBodyType(), USER_DTO_REFERENCE_TYPES),
                data: { servers },
            });

            const schema = requestBodySchema(spec);

            expect(Object.keys(schema)).toEqual(['allOf']);
            expect(schema.allOf).toHaveLength(2);
            expect(schema.allOf![0]).toEqual({ $ref: '#/components/schemas/UserDto' });
            expect(schema.allOf![1]).toEqual(BODY_PROP_MEMBER);
        });

        // Composing here would emit `allOf: [{type: 'string'}, {type: 'object', …}]` —
        // schema-valid, so nothing downstream catches it, yet unsatisfiable by any
        // JSON value. Rejecting is the only honest answer.
        it('rejects a scalar body carrying bodyProp properties', async () => {
            await expect(generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(stringType()),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        it('rejects an array body carrying bodyProp properties', async () => {
            await expect(generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(arrayType(refObjectType('User')), USER_REFERENCE_TYPES),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        // An alias is transparent: `type Id = string` is no more mergeable than the
        // `string` it names, and `isObjectLikeType` unwraps to see that.
        it('rejects a refAlias body wrapping a scalar', async () => {
            await expect(generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(
                    createRefAlias('Id', stringType()),
                    { Id: createRefAlias('Id', stringType()) },
                ),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        it('rejects a union body carrying bodyProp properties', async () => {
            await expect(generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(
                    unionType([refObjectType('User'), refObjectType('Audit')]),
                    {
                        ...USER_REFERENCE_TYPES,
                        Audit: createRefObject('Audit', [
                            createProperty({ name: 'createdAt', type: stringType() }),
                        ]),
                    },
                ),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        // `isObjectLikeType` recurses through every alias it unwraps, so a chain
        // that returns to itself has to be cut — a `RangeError` from a blown stack
        // is not an answer a caller can act on.
        it('rejects a self-returning alias chain instead of overflowing the stack', async () => {
            await expect(generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(cyclicAliasBodyType()),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        // `any` excludes nothing, so `allOf` with the bodyProp shape is satisfiable
        // by real JSON — there is no unsatisfiable schema to protect the caller
        // from, and V2 merges the same pair rather than rejecting it.
        it('composes an any body with the bodyProp properties via allOf', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(anyType()),
                data: { servers },
            });

            const schema = requestBodySchema(spec);
            expect(schema.allOf).toEqual([
                { additionalProperties: true },
                BODY_PROP_MEMBER,
            ]);

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it('composes an object body with the bodyProp properties via allOf', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(objectType()),
                data: { servers },
            });

            expect(requestBodySchema(spec).allOf).toEqual([
                { type: 'object', additionalProperties: true },
                BODY_PROP_MEMBER,
            ]);
        });

        it('emits a valid OpenAPI 3.0 document for a refObject body', async () => {
            const spec = await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(refObjectType('User'), USER_REFERENCE_TYPES),
                data: { servers },
            });

            const result = validateV3Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it('leaves the metadata body parameter a plain reference', async () => {
            const metadata = buildMetadata(refObjectType('User'), USER_REFERENCE_TYPES);
            const before = JSON.stringify(metadata);

            await generateSwagger({
                version: Version.V3,
                metadata,
                data: { servers },
            });

            expect(JSON.stringify(metadata)).toEqual(before);
        });
    });

    describe('V2', () => {
        // Swagger 2.0 has no `allOf` a body parameter could carry alongside its
        // properties, so the named type is flattened through `referenceTypes` —
        // the same resolution `getSchemaForIntersectionType` performs.
        it('flattens a refObject body together with the bodyProp properties', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(refObjectType('User'), USER_REFERENCE_TYPES),
                data: { servers },
            });

            expect(bodyParameterSchema(spec)).toEqual({
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string', description: '' },
                },
                required: ['id', 'name'],
            });
        });

        // `type UserDto = { ... }` resolves to a `refAlias` over a
        // `nestedObjectLiteral`, which is just as mergeable as the inline literal it
        // aliases — a `refObject`-only gate would drop the whole declared body here.
        it('flattens a refAlias body wrapping an object literal', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(refAliasBodyType(), USER_DTO_REFERENCE_TYPES),
                data: { servers },
            });

            expect(bodyParameterSchema(spec)).toEqual({
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string', description: '' },
                },
                required: ['id', 'name'],
            });
        });

        it('emits a valid Swagger 2.0 document for a refAlias body', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(refAliasBodyType(), USER_DTO_REFERENCE_TYPES),
                data: { servers },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        // Every per-property annotation the definition carries has to survive the
        // flatten: a bare `getSchemaForType(prop.type)` would emit `{type: 'string'}`
        // for a property the same document documents, deprecates and constrains.
        it('keeps the property and model annotations the definition carries', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(refObjectType('User'), ANNOTATED_REFERENCE_TYPES),
                data: { servers },
            });

            const schema = bodyParameterSchema(spec);

            expect(schema.properties!.id).toEqual({
                type: 'string',
                description: 'the id',
                'x-deprecated': true,
                minLength: 3,
                'x-foo': 1,
            });

            // Identical to the definition's own property — the merge must not degrade
            // it, and the two must not drift apart.
            expect(schema.properties!.id).toEqual(spec.definitions!.User!.properties!.id);

            // The model's own annotations survive the flatten too.
            expect(schema.description).toEqual('A user model');
            expect(schema.example).toEqual({ id: 'abc' });
        });

        // `nick` is `string | undefined` declared `required` — `buildSchemaForRefObject`
        // filters it out of the definition's `required`, and the flattened body must
        // not demand a property the same document reports optional.
        it('omits an undefined-typed property from required, as the definition does', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(refObjectType('User'), ANNOTATED_REFERENCE_TYPES),
                data: { servers },
            });

            expect(bodyParameterSchema(spec).required).toEqual(['id', 'name']);
            expect(spec.definitions!.User!.required).toEqual(['id']);
        });

        // An intersection body flattens the same way here as it composes in V3 —
        // without this the two emitters would disagree on the very input #923 is about.
        it('flattens an intersection body together with the bodyProp properties', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(
                    intersectionType([refObjectType('User'), refObjectType('Audit')]),
                    {
                        ...USER_REFERENCE_TYPES,
                        Audit: createRefObject('Audit', [
                            createProperty({ name: 'createdAt', type: stringType() }),
                        ]),
                    },
                ),
                data: { servers },
            });

            expect(bodyParameterSchema(spec)).toEqual({
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    createdAt: { type: 'string' },
                    name: { type: 'string', description: '' },
                },
                required: ['name'],
            });
        });

        // Swagger 2.0 has no `allOf` a body parameter could carry, and replacing the
        // declared body wholesale is the silent data loss #923 reported. Both emitters
        // reject the same input with the same code rather than disagreeing.
        it('rejects a scalar body carrying bodyProp properties', async () => {
            await expect(generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(stringType()),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        it('rejects an array body carrying bodyProp properties', async () => {
            await expect(generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(arrayType(refObjectType('User')), USER_REFERENCE_TYPES),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        // `buildFlattenedBodySchema` recurses through the alias rather than testing
        // one shape, so an alias over a scalar is rejected and an alias over a
        // `refObject` (below) still merges.
        it('rejects a refAlias body wrapping a scalar', async () => {
            await expect(generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(
                    createRefAlias('Id', stringType()),
                    { Id: createRefAlias('Id', stringType()) },
                ),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        // The union is the case the emitted-schema gate could not see: V2's union
        // fallback renders any multi-member union as a bare `{type: 'object'}`, so
        // `schema.type === 'object'` was true and the properties merged into a
        // placeholder holding none of the union's members — the declared body gone,
        // silently, while V3 threw for the same metadata.
        it('rejects a union body carrying bodyProp properties', async () => {
            await expect(generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(
                    unionType([refObjectType('User'), refObjectType('Audit')]),
                    {
                        ...USER_REFERENCE_TYPES,
                        Audit: createRefObject('Audit', [
                            createProperty({ name: 'createdAt', type: stringType() }),
                        ]),
                    },
                ),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        it('rejects a self-returning alias chain instead of overflowing the stack', async () => {
            await expect(generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(cyclicAliasBodyType()),
                data: { servers },
            })).rejects.toMatchObject({ code: 'SWAGGER_BODY_PROP_TYPE_CONFLICT' });
        });

        // An open body is not a conflict — narrowing it with the declared properties
        // is exactly what the author asked for, and V3 composes the same pair.
        it('merges the bodyProp properties into an any body', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(anyType()),
                data: { servers },
            });

            expect(bodyParameterSchema(spec)).toEqual({
                type: 'object',
                properties: { name: { type: 'string', description: '' } },
                required: ['name'],
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it('merges the bodyProp properties into an object body', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(objectType()),
                data: { servers },
            });

            expect(bodyParameterSchema(spec)).toEqual({
                type: 'object',
                additionalProperties: true,
                properties: { name: { type: 'string', description: '' } },
                required: ['name'],
            });
        });

        it('flattens a refAlias body wrapping a refObject', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(
                    createRefAlias('UserRef', refObjectType('User')),
                    {
                        ...USER_REFERENCE_TYPES,
                        UserRef: createRefAlias('UserRef', refObjectType('User')),
                    },
                ),
                data: { servers },
            });

            expect(bodyParameterSchema(spec)).toEqual({
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string', description: '' },
                },
                required: ['id', 'name'],
            });
        });

        it('emits a valid Swagger 2.0 document for a refObject body', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(refObjectType('User'), USER_REFERENCE_TYPES),
                data: { servers },
            });

            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it('leaves the metadata body parameter a plain reference', async () => {
            const metadata = buildMetadata(refObjectType('User'), USER_REFERENCE_TYPES);
            const before = JSON.stringify(metadata);

            await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers },
            });

            expect(JSON.stringify(metadata)).toEqual(before);
        });
    });
});
