/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { Metadata } from '@trapi/core';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createResponse,
    refObjectType,
    stringType,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV31Spec, validateV3Spec } from '../../helpers/schema-validator';

const V3_VERSIONS = [Version.V3, Version.V3_1, Version.V3_2] as const;

const errorResponse = () => createResponse({
    status: 'default',
    description: 'Error',
    schema: refObjectType('ErrorResponse'),
});

// Two methods on one controller: the point of the option is that it lands on
// EVERY operation — a single decorated method already worked before.
function metadata(): Metadata {
    return createMetadata([
        createController({
            name: 'UserController',
            paths: ['users'],
            methods: [
                createMethod({
                    name: 'getMany',
                    method: 'get',
                    path: '',
                    type: stringType(),
                    responses: [createResponse({ status: '200', description: 'Ok' })],
                }),
                createMethod({
                    name: 'create',
                    method: 'post',
                    path: '',
                    type: stringType(),
                    responses: [createResponse({ status: '201', description: 'Created' })],
                }),
            ],
        }),
    ]);
}

describe('document responses', () => {
    it('should merge data.responses into every v2 operation', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata: metadata(),
            data: { responses: [errorResponse()] },
        });

        expect(Object.keys(spec.paths['/users']!.get!.responses).sort()).toEqual(['200', 'default']);
        expect(Object.keys(spec.paths['/users']!.post!.responses).sort()).toEqual(['201', 'default']);
        expect(spec.paths['/users']!.get!.responses.default).toEqual({
            description: 'Error',
            schema: { $ref: '#/definitions/ErrorResponse' },
        });
        expect(validateV2Spec(spec).errors).toEqual([]);
    });

    it.each(V3_VERSIONS)('should merge data.responses into every %s operation', async (version) => {
        const spec = await generateSwagger({
            version,
            metadata: metadata(),
            data: { responses: [errorResponse()] },
        });

        expect(Object.keys(spec.paths['/users']!.get!.responses).sort()).toEqual(['200', 'default']);
        expect(Object.keys(spec.paths['/users']!.post!.responses).sort()).toEqual(['201', 'default']);
        expect(spec.paths['/users']!.get!.responses.default).toEqual({
            description: 'Error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        });

        // No OAI schema exists for 3.2 yet, so it is validated against the 3.1
        // one minus that schema's `openapi: 3.1.x` version pattern — the same
        // accommodation schema-validation.spec.ts makes.
        const result = version === Version.V3 ? validateV3Spec(spec) : validateV31Spec(spec);
        const errors = result.errors.filter((e) => !e.includes('must match pattern'));
        expect(errors, errors.join('\n')).toEqual([]);
    });

    it('should let a v2 method response win over a colliding document response', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata: metadata(),
            data: { responses: [createResponse({ status: '200', description: 'FROM_DOCUMENT' })] },
        });

        expect(spec.paths['/users']!.get!.responses['200']).toEqual({ description: 'Ok' });
        // The method that has no 200 of its own still receives the document one.
        expect(spec.paths['/users']!.post!.responses['200']).toEqual({ description: 'FROM_DOCUMENT' });
    });

    it.each(V3_VERSIONS)('should let a %s method response win over a colliding document response', async (version) => {
        const spec = await generateSwagger({
            version,
            metadata: metadata(),
            data: { responses: [createResponse({ status: '200', description: 'FROM_DOCUMENT' })] },
        });

        expect(spec.paths['/users']!.get!.responses['200']!.description).toEqual('Ok');
        expect(spec.paths['/users']!.post!.responses['200']!.description).toEqual('FROM_DOCUMENT');
    });

    // v2 derives an operation's `produces` from its responses. A document
    // response that loses the status key must not leave its media type behind.
    it('should not advertise the media type of a v2 document response the method overrode', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata: createMetadata([
                createController({
                    name: 'UserController',
                    paths: ['users'],
                    methods: [createMethod({
                        name: 'getMany',
                        method: 'get',
                        path: '',
                        type: stringType(),
                        responses: [createResponse({
                            status: '200',
                            description: 'Ok',
                            schema: stringType(),
                            produces: ['application/json'],
                        })],
                    })],
                }),
            ]),
            data: {
                responses: [createResponse({
                    status: '200',
                    description: 'Problem',
                    schema: stringType(),
                    produces: ['application/problem+json'],
                })],
            },
        });

        expect(spec.paths['/users']!.get!.responses['200']).toEqual({
            description: 'Ok',
            schema: { type: 'string' },
        });
        expect(spec.paths['/users']!.get!.produces).toEqual(['application/json']);
    });

    // The no-opt-in guarantee, pinned rather than argued.
    it.each([Version.V2, ...V3_VERSIONS])('should not change %s output when the option is absent or empty', async (version) => {
        const baseline = await generateSwagger({ version, metadata: metadata() });
        const undefinedOption = await generateSwagger({
            version,
            metadata: metadata(),
            data: {},
        });
        const emptyOption = await generateSwagger({
            version,
            metadata: metadata(),
            data: { responses: [] },
        });

        expect(JSON.stringify(undefinedOption)).toEqual(JSON.stringify(baseline));
        expect(JSON.stringify(emptyOption)).toEqual(JSON.stringify(baseline));
    });

    // The reporter's actual composition: the referenced component comes from
    // `extra`, not from metadata.referenceTypes.
    it('should compose a document response ref with a component supplied through extra', async () => {
        const spec = await generateSwagger({
            version: Version.V3,
            metadata: metadata(),
            data: {
                responses: [errorResponse()],
                extra: { components: { schemas: { ErrorResponse: { type: 'object', properties: { message: { type: 'string' } } } } } },
            },
        });

        expect(spec.components!.schemas!.ErrorResponse).toEqual({
            type: 'object',
            properties: { message: { type: 'string' } },
        });
        expect(validateV3Spec(spec).errors).toEqual([]);
    });
});
