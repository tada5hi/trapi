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
    createRefObject,
    createResponse,
    refObjectType,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV31Spec, validateV3Spec } from '../../helpers/schema-validator';

const V3_VERSIONS = [Version.V3, Version.V3_1, Version.V3_2] as const;

// The shape `MethodGenerator` produces for a method whose handler set
// `draft.successStatus = '202'`: the return type documented under 202 only.
function metadata(): Metadata {
    return createMetadata([
        createController({
            name: 'RunController',
            paths: ['runs'],
            methods: [
                createMethod({
                    name: 'start',
                    method: 'post',
                    path: '',
                    type: refObjectType('RunView'),
                    responses: [createResponse({
                        status: '202',
                        description: 'Accepted',
                        schema: refObjectType('RunView'),
                        examples: [{ value: { id: '1' } }],
                    })],
                }),
            ],
        }),
    ], { RunView: createRefObject('RunView', []) });
}

const errorResponse = () => createResponse({
    status: 'default',
    description: 'Error',
    schema: refObjectType('RunView'),
});

describe('success status', () => {
    it('should emit the return type under the success status in v2', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata: metadata(),
            data: { responses: [errorResponse()] },
        });
        const { responses } = spec.paths['/runs']!.post!;

        expect(Object.keys(responses).sort()).toEqual(['202', 'default']);
        expect(responses['202']).toEqual({
            description: 'Accepted',
            schema: { $ref: '#/definitions/RunView' },
            examples: { 'application/json': { id: '1' } },
        });
        expect(validateV2Spec(spec).errors).toEqual([]);
    });

    it.each(V3_VERSIONS)('should emit the return type under the success status in %s', async (version) => {
        const spec = await generateSwagger({
            version,
            metadata: metadata(),
            data: { responses: [errorResponse()] },
        });
        const { responses } = spec.paths['/runs']!.post!;

        expect(Object.keys(responses).sort()).toEqual(['202', 'default']);
        expect(responses['202']!.description).toEqual('Accepted');
        expect(responses['202']!.content!['application/json']!.schema).toEqual({ $ref: '#/components/schemas/RunView' });

        const result = version === Version.V3 ? validateV3Spec(spec) : validateV31Spec(spec);
        const errors = result.errors.filter((e) => !e.includes('must match pattern'));

        expect(errors, errors.join('\n')).toEqual([]);
    });
});
