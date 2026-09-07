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
    stringType,
} from '../../helpers/metadata-builder';
import { validateV31Spec } from '../../helpers/schema-validator';

const servers = [{ url: '/' }];

// One method declaring one parameter of every source an operation can carry,
// mounted twice so a synthesized path variable (`realmId` — no decorated
// argument declares it) shows up next to a declared one (`id`).
function buildMetadata(queryOverrides: { allowEmptyValue?: boolean } = {}) {
    return createMetadata([
        createController({
            name: 'UserController',
            paths: ['users', 'realms/:realmId/users'],
            methods: [
                createMethod({
                    name: 'getOne',
                    method: 'get',
                    path: ':id',
                    parameters: [
                        createParameter({
                            name: 'id',
                            in: 'path',
                            type: stringType(),
                            description: 'The user id.',
                        }),
                        createParameter({
                            name: 'X-Trace',
                            in: 'header',
                            type: stringType(),
                            required: false,
                        }),
                        createParameter({
                            name: 'session',
                            in: 'cookie',
                            type: stringType(),
                            required: false,
                        }),
                        createParameter({
                            name: 'filter',
                            in: 'queryProp',
                            type: stringType(),
                            required: false,
                            ...queryOverrides,
                        }),
                    ],
                    responses: [createResponse({ status: '200' })],
                }),
            ],
        }),
    ]);
}

const parametersOf = (op: any) => (op.parameters ?? []) as any[];
const parameterNamed = (op: any, name: string) => parametersOf(op).find((p) => p.name === name);

function allParameters(spec: any) {
    const output : any[] = [];
    for (const path of Object.values(spec.paths) as any[]) {
        for (const operation of Object.values(path) as any[]) {
            output.push(...parametersOf(operation));
        }
    }

    return output;
}

describe('parameter flags (#914)', () => {
    describe('V3', () => {
        async function build(queryOverrides: { allowEmptyValue?: boolean } = {}) {
            return await generateSwagger({
                version: Version.V3,
                metadata: buildMetadata(queryOverrides),
                data: { servers },
            }) as SpecV3;
        }

        it('should not emit allowEmptyValue on a path parameter', async () => {
            const spec = await build();

            const parameter = parameterNamed(spec.paths['/users/{id}'].get!, 'id');

            expect(parameter.in).toEqual('path');
            expect(parameter).not.toHaveProperty('allowEmptyValue');
            // Exact key set — `not.toHaveProperty` alone would also pass on a
            // parameter that vanished entirely or grew an unrelated key.
            expect(Object.keys(parameter).sort()).toEqual([
                'deprecated',
                'description',
                'examples',
                'in',
                'name',
                'required',
                'schema',
            ]);
        });

        it('should not emit allowEmptyValue on a header parameter', async () => {
            const spec = await build();

            const parameter = parameterNamed(spec.paths['/users/{id}'].get!, 'X-Trace');

            expect(parameter.in).toEqual('header');
            expect(parameter).not.toHaveProperty('allowEmptyValue');
        });

        it('should not emit allowEmptyValue on a cookie parameter', async () => {
            const spec = await build();

            const parameter = parameterNamed(spec.paths['/users/{id}'].get!, 'session');

            expect(parameter.in).toEqual('cookie');
            expect(parameter).not.toHaveProperty('allowEmptyValue');
        });

        it('should emit allowEmptyValue false on a query parameter by default', async () => {
            const spec = await build();

            const parameter = parameterNamed(spec.paths['/users/{id}'].get!, 'filter');

            expect(parameter.in).toEqual('query');
            expect(parameter.allowEmptyValue).toEqual(false);
        });

        it('should emit allowEmptyValue true when the metadata declares it', async () => {
            // `Parameter.allowEmptyValue` (@trapi/core) was previously ignored — the
            // emitter hardcoded `allowEmptyValue: false`, so a decorated
            // `{ allowEmptyValue: true }` never reached the document.
            const spec = await build({ allowEmptyValue: true });

            const parameter = parameterNamed(spec.paths['/users/{id}'].get!, 'filter');

            expect(parameter.in).toEqual('query');
            expect(parameter.allowEmptyValue).toEqual(true);
        });

        it('should never emit allowReserved on any parameter', async () => {
            const spec = await build();

            const parameters = allParameters(spec);

            expect(parameters.length).toBeGreaterThan(0);
            for (const parameter of parameters) {
                expect(parameter).not.toHaveProperty('allowReserved');
            }
        });

        it('should emit a consistent shape for a synthesized and a declared path parameter', async () => {
            const spec = await build();

            const operation = spec.paths['/realms/{realmId}/users/{id}'].get!;

            const synthesized = parameterNamed(operation, 'realmId');
            const declared = parameterNamed(operation, 'id');

            expect(synthesized).toEqual({
                name: 'realmId',
                in: 'path',
                required: true,
                schema: { type: 'string' },
            });
            expect(synthesized).not.toHaveProperty('allowEmptyValue');

            expect(declared.in).toEqual('path');
            expect(declared.required).toEqual(true);
            expect(declared).not.toHaveProperty('allowEmptyValue');
        });
    });

    describe('V2', () => {
        it('should not emit allowEmptyValue on any parameter', async () => {
            // Swagger 2.0 permits `allowEmptyValue` on `query` and `formData`
            // parameters only; the V2 emitter has never emitted it at all, and
            // this pins that it stays that way.
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildMetadata(),
                data: { servers },
            }) as SpecV2;

            const parameters = allParameters(spec);

            expect(parameters.length).toBeGreaterThan(0);
            for (const parameter of parameters) {
                expect(parameter).not.toHaveProperty('allowEmptyValue');
            }
        });
    });

    describe('schema compliance', () => {
        it('should validate the emitted 3.1 document against the OAI schema', async () => {
            // Deliberately the 3.1 validator, not `validateV3Spec`: the bundled
            // v3.0 schema is Draft-04 and declares `allowEmptyValue` on the single
            // generic Parameter definition, so it accepts the key on any source.
            // Only the 3.1 schema branches per `in` and closes the non-query
            // branches with `unevaluatedProperties: false`, which is what turns
            // `allowEmptyValue` on a path/header/cookie parameter into an error.
            // Do not "simplify" this to `validateV3Spec` — it would stop testing.
            const spec = await generateSwagger({
                version: Version.V3_1,
                metadata: buildMetadata(),
                data: { servers },
            });

            const result = validateV31Spec(spec);
            expect(result.errors, result.errors.join('\n')).toEqual([]);
        });
    });
});
