/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type {
    Metadata,
    MethodType,
    Parameter,
    RefAliasType,
    ReferenceTypes,
} from '@trapi/core';
import type { SpecV2, SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createProperty,
    createRefAlias,
    createRefEnum,
    createRefObject,
    createResponse,
    integerType,
    refEnumType,
    refObjectType,
    stringType,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV3Spec } from '../../helpers/schema-validator';

const servers = [{ url: '/' }];

type Case = {
    parameters: Parameter[];
    path?: string;
    method?: MethodType;
    referenceTypes?: ReferenceTypes;
};

// Every test builds its own `Metadata` — a shared object would let one emission
// observe another's leftovers, which is exactly the failure mode this file is
// meant to be blind to (the metadata-immutability guarantee is pinned elsewhere).
function buildMetadata(input: Case) : Metadata {
    return createMetadata(
        [
            createController({
                name: 'StatusController',
                paths: ['statuses'],
                methods: [
                    createMethod({
                        name: 'handle',
                        method: input.method ?? 'get',
                        path: input.path ?? '',
                        parameters: input.parameters,
                        responses: [createResponse({ status: '200' })],
                    }),
                ],
            }),
        ],
        input.referenceTypes ?? {},
    );
}

async function emitV2(input: Case) : Promise<SpecV2> {
    return await generateSwagger({
        version: Version.V2,
        metadata: buildMetadata(input),
        data: { servers },
    }) as SpecV2;
}

async function emitV3(input: Case) : Promise<SpecV3> {
    return await generateSwagger({
        version: Version.V3,
        metadata: buildMetadata(input),
        data: { servers },
    }) as SpecV3;
}

const parametersOf = (operation: any) => (operation.parameters ?? []);
const parameterNamed = (operation: any, name: string) => parametersOf(operation)
    .find((p: any) => p.name === name);

// TypeScript rejects a circular type alias (TS2456), so `@trapi/metadata` cannot
// emit one — these are built by hand because `generateSwagger` accepts `Metadata`
// from any producer (a cached document, a Babel-based extractor, a fixture), and
// `RangeError: Maximum call stack size exceeded` is a poor answer for one.
function selfReferentialAlias(refName: string) : RefAliasType {
    const alias = {
        typeName: 'refAlias',
        refName,
        deprecated: false,
        validators: {},
    } as RefAliasType;

    alias.type = alias;

    return alias;
}

function mutualAliases(first: string, second: string) : [RefAliasType, RefAliasType] {
    const a = {
        typeName: 'refAlias',
        refName: first,
        deprecated: false,
        validators: {},
    } as RefAliasType;
    const b = {
        typeName: 'refAlias',
        refName: second,
        deprecated: false,
        validators: {},
    } as RefAliasType;

    a.type = b;
    b.type = a;

    return [a, b];
}

// --- the cases -------------------------------------------------------------
//
// A Swagger 2.0 non-body parameter carries its type inline: only `bodyParameter`
// has a `schema`, so `$ref` — and `object` — have nowhere to live. Every case
// below used to emit a parameter with neither `type` nor `$ref`, which matches
// none of the 2.0 location subschemas (`v2.0-schema.json`:
// `pathParameterSubSchema.type` is ['string','number','boolean','integer','array']).

// The one string-leaf alias kept in the file. It cannot on its own distinguish a
// real dereference from the `type: 'string'` floor further down — that is what the
// integer-leaf cases below are for — but it does pin the path location, whose
// `description` runs through `pathParameterDescription`.
const REF_ALIAS_PATH : Case = {
    path: ':status',
    parameters: [
        createParameter({
            name: 'status',
            in: 'path',
            type: createRefAlias('Status', stringType()),
        }),
    ],
    referenceTypes: { Status: createRefAlias('Status', stringType()) },
};

// `integer`, not `string`: the leaf has to differ from the lossy floor, otherwise
// disabling the dereference outright leaves the emitted parameter unchanged.
const REF_ALIAS_HEADER : Case = {
    parameters: [
        createParameter({
            name: 'x-priority',
            in: 'header',
            type: createRefAlias('Priority', integerType()),
        }),
    ],
    referenceTypes: { Priority: createRefAlias('Priority', integerType()) },
};

const REF_ALIAS_QUERY : Case = {
    parameters: [
        createParameter({
            name: 'priority',
            in: 'queryProp',
            type: createRefAlias('Priority', integerType()),
            required: false,
        }),
    ],
    referenceTypes: { Priority: createRefAlias('Priority', integerType()) },
};

const REF_ENUM_QUERY : Case = {
    parameters: [
        createParameter({
            name: 'status',
            in: 'queryProp',
            type: refEnumType('Status', ['active', 'inactive']),
            required: false,
        }),
    ],
    referenceTypes: { Status: createRefEnum('Status', ['active', 'inactive']) },
};

// An alias pointing at an alias pointing at a primitive. The leaf is `integer`,
// not `string`, so the assertion distinguishes a real dereference from the
// `type: 'string'` floor the emitter falls back to.
const REF_ALIAS_CHAIN : Case = {
    path: ':level',
    parameters: [
        createParameter({
            name: 'level',
            in: 'path',
            type: createRefAlias('Level', createRefAlias('LevelValue', integerType())),
        }),
    ],
    referenceTypes: {
        Level: createRefAlias('Level', createRefAlias('LevelValue', integerType())),
        LevelValue: createRefAlias('LevelValue', integerType()),
    },
};

// An alias carrying its own JSDoc-derived annotations. `TypeNodeResolver` fills
// `format`/`default`/`description`/`validators` from the alias declaration, and
// v3 keeps them by emitting a `$ref`; a v2 non-body parameter has to inline them
// or the same document says two different things about one alias.
const ANNOTATED_ALIAS = () : RefAliasType => ({
    typeName: 'refAlias',
    refName: 'Email',
    type: stringType(),
    description: 'An email address.',
    format: 'email',
    default: 'a@b.c',
    validators: { pattern: { value: '^.+@.+$' } },
    deprecated: false,
});

const ANNOTATED_ALIAS_HEADER : Case = {
    parameters: [
        createParameter({
            name: 'x-owner',
            in: 'header',
            type: ANNOTATED_ALIAS(),
        }),
    ],
    referenceTypes: { Email: ANNOTATED_ALIAS() },
};

// The parameter's own description and default must win over the alias's.
const ANNOTATED_ALIAS_OVERRIDDEN : Case = {
    parameters: [
        createParameter({
            name: 'x-owner',
            in: 'header',
            type: ANNOTATED_ALIAS(),
            description: 'The account owner.',
            default: 'owner@example.com',
        }),
    ],
    referenceTypes: { Email: ANNOTATED_ALIAS() },
};

// A `refObject` on a header is the thing Swagger 2.0 genuinely cannot model —
// there is no reference and no object type available at a non-body location.
const REF_OBJECT_HEADER : Case = {
    parameters: [
        createParameter({
            name: 'context',
            in: 'header',
            type: refObjectType('RequestContext'),
        }),
    ],
    referenceTypes: {
        RequestContext: createRefObject('RequestContext', [
            createProperty({ name: 'realmId', type: stringType() }),
        ]),
    },
};

// The dereference must not reach body parameters: `in: body` is the one location
// with a `schema`, so a reference belongs there verbatim. Each of the three
// reference kinds gets its own case — `refObject` alone proves nothing, since it
// is the one kind the dereference never rewrites.
const REF_OBJECT_BODY : Case = {
    method: 'post',
    parameters: [
        createParameter({
            name: 'user',
            in: 'body',
            type: refObjectType('User'),
        }),
    ],
    referenceTypes: {
        User: createRefObject('User', [
            createProperty({ name: 'name', type: stringType() }),
        ]),
    },
};

const REF_ENUM_BODY : Case = {
    method: 'post',
    parameters: [
        createParameter({
            name: 'status',
            in: 'body',
            type: refEnumType('Status', ['active', 'inactive']),
        }),
    ],
    referenceTypes: { Status: createRefEnum('Status', ['active', 'inactive']) },
};

const REF_ALIAS_BODY : Case = {
    method: 'post',
    parameters: [
        createParameter({
            name: 'id',
            in: 'body',
            type: createRefAlias('UserId', stringType()),
        }),
    ],
    referenceTypes: { UserId: createRefAlias('UserId', stringType()) },
};

const [PING, PONG] = mutualAliases('Ping', 'Pong');

const SELF_REF_ALIAS_HEADER : Case = {
    parameters: [
        createParameter({
            name: 'x-loop',
            in: 'header',
            type: selfReferentialAlias('Loop'),
        }),
    ],
    referenceTypes: { Loop: selfReferentialAlias('Loop') },
};

const MUTUAL_REF_ALIAS_QUERY : Case = {
    parameters: [
        createParameter({
            name: 'ping',
            in: 'queryProp',
            type: PING,
            required: false,
        }),
    ],
    referenceTypes: { Ping: PING, Pong: PONG },
};

describe('V2 non-body parameter types', () => {
    // The assertions below are whole-object: they pin the inline `type` and, by
    // being exact, also rule out the `$ref`/`schema` a non-body parameter cannot
    // carry and the bare `{description, in, name, required}` the emitter produced
    // before `dereferenceNonBodyType` existed.
    describe('refAlias dereference', () => {
        it('emits an inline type for a path parameter', async () => {
            const spec = await emitV2(REF_ALIAS_PATH);

            expect(parameterNamed(spec.paths['/statuses/{status}'].get!, 'status')).toEqual({
                description: '',
                in: 'path',
                name: 'status',
                required: true,
                type: 'string',
            });
        });

        it('emits the aliased leaf type for a header parameter', async () => {
            const spec = await emitV2(REF_ALIAS_HEADER);

            expect(parameterNamed(spec.paths['/statuses'].get!, 'x-priority')).toEqual({
                description: '',
                format: 'int32',
                in: 'header',
                name: 'x-priority',
                required: true,
                type: 'integer',
            });
        });

        it('emits the aliased leaf type for a queryProp parameter', async () => {
            const spec = await emitV2(REF_ALIAS_QUERY);

            expect(parameterNamed(spec.paths['/statuses'].get!, 'priority')).toEqual({
                description: '',
                format: 'int32',
                in: 'query',
                name: 'priority',
                required: false,
                type: 'integer',
            });
        });

        it('follows a chain of aliases down to the primitive', async () => {
            const spec = await emitV2(REF_ALIAS_CHAIN);

            expect(parameterNamed(spec.paths['/statuses/{level}'].get!, 'level')).toEqual({
                description: '',
                format: 'int32',
                in: 'path',
                name: 'level',
                required: true,
                type: 'integer',
            });
        });
    });

    describe('refAlias annotations (#917)', () => {
        it('carries the alias description, format, default and validators onto the parameter', async () => {
            const spec = await emitV2(ANNOTATED_ALIAS_HEADER);

            expect(parameterNamed(spec.paths['/statuses'].get!, 'x-owner')).toEqual({
                default: 'a@b.c',
                description: 'An email address.',
                format: 'email',
                in: 'header',
                name: 'x-owner',
                pattern: '^.+@.+$',
                required: true,
                type: 'string',
            });
        });

        it('says the same thing on the parameter as in definitions', async () => {
            const spec = await emitV2(ANNOTATED_ALIAS_HEADER);

            const parameter = parameterNamed(spec.paths['/statuses'].get!, 'x-owner');
            const definition = spec.definitions!.Email;

            expect(definition).toEqual({
                default: 'a@b.c',
                description: 'An email address.',
                format: 'email',
                pattern: '^.+@.+$',
                type: 'string',
            });
            expect(parameter.description).toEqual(definition.description);
            expect(parameter.format).toEqual(definition.format);
            expect(parameter.default).toEqual(definition.default);
            expect(parameter.pattern).toEqual(definition.pattern);
        });

        it('lets the parameter own description and default win over the alias', async () => {
            const spec = await emitV2(ANNOTATED_ALIAS_OVERRIDDEN);

            expect(parameterNamed(spec.paths['/statuses'].get!, 'x-owner')).toEqual({
                default: 'owner@example.com',
                description: 'The account owner.',
                format: 'email',
                in: 'header',
                name: 'x-owner',
                pattern: '^.+@.+$',
                required: true,
                type: 'string',
            });
        });

        it('keeps emitting a $ref in v3, where the annotations live on the schema', async () => {
            const spec = await emitV3(ANNOTATED_ALIAS_HEADER);

            const parameter = parameterNamed(spec.paths['/statuses'].get!, 'x-owner');

            expect(parameter.schema).toEqual({ $ref: '#/components/schemas/Email' });
            expect(spec.components!.schemas!.Email).toEqual({
                default: 'a@b.c',
                description: 'An email address.',
                format: 'email',
                pattern: '^.+@.+$',
                type: 'string',
            });
        });
    });

    describe('refEnum dereference', () => {
        it('emits an inline type and enum for a non-body parameter', async () => {
            const spec = await emitV2(REF_ENUM_QUERY);

            expect(parameterNamed(spec.paths['/statuses'].get!, 'status')).toEqual({
                description: '',
                enum: ['active', 'inactive'],
                in: 'query',
                name: 'status',
                required: false,
                type: 'string',
            });
        });

        it('still emits the referenced enum as a definition', async () => {
            const spec = await emitV2(REF_ENUM_QUERY);

            expect(spec.definitions!.Status).toEqual({
                enum: ['active', 'inactive'],
                type: 'string',
                'x-nullable': false,
            });
        });
    });

    describe('circular refAlias', () => {
        // Both cases recursed forever before `dereferenceNonBodyType` carried a
        // `seen` set: the `await` below is itself an assertion, since the emission
        // rejected with `RangeError: Maximum call stack size exceeded`.
        it('resolves and falls back to string for a self-referential alias', async () => {
            const spec = await emitV2(SELF_REF_ALIAS_HEADER);

            expect(parameterNamed(spec.paths['/statuses'].get!, 'x-loop')).toEqual({
                description: '',
                in: 'header',
                name: 'x-loop',
                required: true,
                type: 'string',
            });
            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it('resolves and falls back to string for two mutually referential aliases', async () => {
            const spec = await emitV2(MUTUAL_REF_ALIAS_QUERY);

            expect(parameterNamed(spec.paths['/statuses'].get!, 'ping')).toEqual({
                description: '',
                in: 'query',
                name: 'ping',
                required: false,
                type: 'string',
            });
            const result = validateV2Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });
    });

    describe('the lossy floor', () => {
        // Swagger 2.0 cannot express an object-typed header at all. `string` is a
        // deliberate floor — a parameter no client can use is still better than one
        // that matches no location subschema and fails every validator. It is not a
        // claim about the type: v3, which has a `schema` on every parameter, keeps
        // the reference intact (pinned by the next test, so the contrast is visible
        // if either side ever moves).
        it('V2: falls back to string for a refObject header parameter', async () => {
            const spec = await emitV2(REF_OBJECT_HEADER);

            expect(parameterNamed(spec.paths['/statuses'].get!, 'context')).toEqual({
                description: '',
                in: 'header',
                name: 'context',
                required: true,
                type: 'string',
            });
        });

        it('V3: keeps the $ref for the same input', async () => {
            const spec = await emitV3(REF_OBJECT_HEADER);

            expect(parameterNamed(spec.paths['/statuses'].get!, 'context')).toEqual({
                deprecated: false,
                description: '',
                in: 'header',
                name: 'context',
                required: true,
                schema: { $ref: '#/components/schemas/RequestContext' },
            });
        });
    });

    describe('body parameters', () => {
        it('keeps the $ref of a refObject body parameter', async () => {
            const spec = await emitV2(REF_OBJECT_BODY);

            expect(parameterNamed(spec.paths['/statuses'].post!, 'user')).toEqual({
                description: '',
                in: 'body',
                name: 'user',
                required: true,
                schema: { $ref: '#/definitions/User' },
            });
        });

        it('keeps the $ref of a refEnum body parameter', async () => {
            const spec = await emitV2(REF_ENUM_BODY);

            // Dereferencing here would inline the members as
            // `{type: 'string', enum: [...], 'x-nullable': false}` — the `$ref`
            // silently erased from a location that can hold it.
            expect(parameterNamed(spec.paths['/statuses'].post!, 'status')).toEqual({
                description: '',
                in: 'body',
                name: 'status',
                required: true,
                schema: { $ref: '#/definitions/Status' },
            });
        });

        it('keeps the $ref of a refAlias body parameter', async () => {
            const spec = await emitV2(REF_ALIAS_BODY);

            // Dereferencing here would flatten the alias to `{type: 'string'}`.
            expect(parameterNamed(spec.paths['/statuses'].post!, 'id')).toEqual({
                description: '',
                in: 'body',
                name: 'id',
                required: true,
                schema: { $ref: '#/definitions/UserId' },
            });
        });
    });

    describe('schema compliance', () => {
        // The assertion that actually encodes the bug: an untyped non-body parameter
        // produced ~10 ajv errors apiece, because it matched none of the location
        // branches of the 2.0 Parameter Object.
        const cases: Array<[string, Case]> = [
            ['refAlias path', REF_ALIAS_PATH],
            ['refAlias header', REF_ALIAS_HEADER],
            ['refAlias queryProp', REF_ALIAS_QUERY],
            ['refAlias chain', REF_ALIAS_CHAIN],
            ['annotated refAlias header', ANNOTATED_ALIAS_HEADER],
            ['annotated refAlias header, overridden', ANNOTATED_ALIAS_OVERRIDDEN],
            ['refEnum queryProp', REF_ENUM_QUERY],
            ['refObject header', REF_OBJECT_HEADER],
            ['refObject body', REF_OBJECT_BODY],
            ['refEnum body', REF_ENUM_BODY],
            ['refAlias body', REF_ALIAS_BODY],
            ['self-referential refAlias header', SELF_REF_ALIAS_HEADER],
            ['mutually referential refAlias queryProp', MUTUAL_REF_ALIAS_QUERY],
        ];

        it.each(cases)('V2: %s validates', async (_name, input) => {
            const result = validateV2Spec(await emitV2(input));

            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });

        it.each(cases)('V3: %s validates', async (_name, input) => {
            const result = validateV3Spec(await emitV3(input));

            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });
    });
});
