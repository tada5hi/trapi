/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    describe,
    expect,
    it,
} from 'vitest';
import type { Metadata, Response } from '@trapi/core';
import type { SpecV2, SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createProperty,
    createRefObject,
    createResponse,
    refObjectType,
} from '../../helpers/metadata-builder';
import { validateV2Spec, validateV31Spec, validateV3Spec } from '../../helpers/schema-validator';

// The two response shapes the metadata generator produces for a success
// response: no `schema` key under a no-content status, and `produces` scoped
// to the success response.
function buildMetadata(responses: Response[]): Metadata {
    return createMetadata(
        [
            createController({
                name: 'ReportController',
                paths: ['reports'],
                methods: [
                    createMethod({
                        name: 'run',
                        method: 'post',
                        path: '',
                        responses,
                        type: refObjectType('Report'),
                    }),
                ],
            }),
        ],
        {
            Report: createRefObject('Report', [
                createProperty({ name: 'id', type: { typeName: 'string' } }),
            ]),
        },
    );
}

const noContent = () => buildMetadata([
    createResponse({ status: '204', description: 'No content' }),
]);

const scopedProduces = () => buildMetadata([
    createResponse({
        status: '409',
        description: 'Conflict',
        schema: refObjectType('Report'),
    }),
    createResponse({
        status: '200',
        description: 'Ok',
        schema: refObjectType('Report'),
        produces: ['application/xml'],
    }),
]);

const buildV2 = (metadata: Metadata) => generateSwagger({ version: Version.V2, metadata }) as Promise<SpecV2>;

const buildV3 = (metadata: Metadata, version: typeof Version.V3 | typeof Version.V3_1 = Version.V3) => generateSwagger({
    version,
    metadata,
    data: { servers: 'http://localhost:3000/' },
}) as Promise<SpecV3>;

describe('success response', () => {
    describe('a 204 response without schema', () => {
        it('should emit a body-less 204 in V2', async () => {
            const spec = await buildV2(noContent());

            expect(spec.paths['/reports']!.post!.responses).toEqual({ 204: { description: 'No content' } });
            expect(validateV2Spec(spec)).toEqual({ valid: true, errors: [] });
        });

        it('should emit a body-less 204 in V3', async () => {
            const spec = await buildV3(noContent());

            expect(spec.paths['/reports']!.post!.responses).toEqual({ 204: { description: 'No content' } });
            expect(validateV3Spec(spec)).toEqual({ valid: true, errors: [] });
        });

        it('should emit a body-less 204 in V3.1', async () => {
            const spec = await buildV3(noContent(), Version.V3_1);

            expect(spec.paths['/reports']!.post!.responses).toEqual({ 204: { description: 'No content' } });
            expect(validateV31Spec(spec)).toEqual({ valid: true, errors: [] });
        });
    });

    describe('produces on the success response only', () => {
        it('should scope the media type to the success response in V3', async () => {
            const spec = await buildV3(scopedProduces());
            const { responses } = spec.paths['/reports']!.post!;

            expect(responses).toEqual({
                200: {
                    description: 'Ok',
                    content: { 'application/xml': { schema: { $ref: '#/components/schemas/Report' } } },
                },
                409: {
                    description: 'Conflict',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } },
                },
            });
            expect(validateV3Spec(spec)).toEqual({ valid: true, errors: [] });
        });

        it('should list the success media type operation-wide in V2', async () => {
            // Swagger 2.0 has no per-response media types: the operation
            // advertises the success response's list for every response.
            const spec = await buildV2(scopedProduces());
            const operation = spec.paths['/reports']!.post!;

            expect(operation.produces).toEqual(['application/xml']);
            expect(operation.responses).toEqual({
                200: { description: 'Ok', schema: { $ref: '#/definitions/Report' } },
                409: { description: 'Conflict', schema: { $ref: '#/definitions/Report' } },
            });
            expect(validateV2Spec(spec)).toEqual({ valid: true, errors: [] });
        });
    });
});
