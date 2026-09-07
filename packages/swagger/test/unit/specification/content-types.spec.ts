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
import type { Controller, Metadata, Method } from '@trapi/core';
import type { SpecV2, SpecV3, SwaggerGenerateData } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    bufferType,
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createResponse,
    fileType,
    refObjectType,
    stringType,
    voidType,
} from '../../helpers/metadata-builder';

// Both emitters cascade by MUTATING method.consumes/produces, so every test
// builds its own metadata object rather than sharing a module-level const.
function buildMetadata(
    method: Partial<Method>,
    controller: Partial<Controller> = {},
) : Metadata {
    return createMetadata([
        createController({
            name: 'RoleController',
            paths: ['roles'],
            methods: [
                createMethod({
                    name: 'add',
                    method: 'post',
                    path: '',
                    parameters: [
                        createParameter({
                            name: 'body',
                            in: 'body',
                            type: refObjectType('Role'),
                        }),
                    ],
                    responses: [
                        createResponse({
                            status: '200',
                            description: 'Ok',
                            schema: refObjectType('Role'),
                        }),
                    ],
                    type: voidType(),
                    ...method,
                }),
            ],
            ...controller,
        }),
    ]);
}

function buildSpecV3(metadata: Metadata, data: SwaggerGenerateData = {}) : Promise<SpecV3> {
    return generateSwagger({
        version: Version.V3_2,
        metadata,
        data: { servers: 'http://localhost:3000/', ...data },
    }) as Promise<SpecV3>;
}

describe('consumes / produces content types (#900)', () => {
    it('should use the method level consumes & produces', async () => {
        const spec = await buildSpecV3(buildMetadata({
            consumes: ['application/vnd.method+json'],
            produces: ['application/vnd.method+json'],
        }));

        const operation = spec.paths['/roles'].post!;

        expect(Object.keys(operation.requestBody!.content)).toEqual(['application/vnd.method+json']);
        expect(Object.keys(operation.responses['200'].content!)).toEqual(['application/vnd.method+json']);
    });

    it('should cascade the controller consumes & produces to the operation', async () => {
        const spec = await buildSpecV3(buildMetadata({}, {
            consumes: ['application/vnd.controller+json'],
            produces: ['application/vnd.controller+json'],
        }));

        const operation = spec.paths['/roles'].post!;

        expect(Object.keys(operation.requestBody!.content)).toEqual(['application/vnd.controller+json']);
        expect(Object.keys(operation.responses['200'].content!)).toEqual(['application/vnd.controller+json']);
    });

    it('should merge the controller and method consumes & produces', async () => {
        const spec = await buildSpecV3(buildMetadata({
            consumes: ['application/vnd.method+json'],
            produces: ['application/vnd.method+json'],
        }, {
            consumes: ['application/vnd.controller+json'],
            produces: ['application/vnd.controller+json'],
        }));

        const operation = spec.paths['/roles'].post!;

        expect(Object.keys(operation.requestBody!.content)).toEqual([
            'application/vnd.controller+json',
            'application/vnd.method+json',
        ]);
        expect(Object.keys(operation.responses['200'].content!)).toEqual([
            'application/vnd.controller+json',
            'application/vnd.method+json',
        ]);
    });

    it('should fall back to the document level consumes & produces', async () => {
        const spec = await buildSpecV3(buildMetadata({}), {
            consumes: ['application/vnd.doc+json'],
            produces: ['application/vnd.docp+json'],
        });

        const operation = spec.paths['/roles'].post!;

        expect(Object.keys(operation.requestBody!.content)).toEqual(['application/vnd.doc+json']);
        expect(Object.keys(operation.responses['200'].content!)).toEqual(['application/vnd.docp+json']);
    });

    it('should default to application/json', async () => {
        const spec = await buildSpecV3(buildMetadata({}));

        const operation = spec.paths['/roles'].post!;

        expect(Object.keys(operation.requestBody!.content)).toEqual(['application/json']);
        expect(Object.keys(operation.responses['200'].content!)).toEqual(['application/json']);
    });

    it('should keep multipart/form-data for file uploads', async () => {
        const metadata = buildMetadata({
            parameters: [
                createParameter({
                    name: 'file',
                    in: 'formData',
                    type: fileType(),
                }),
            ],
        });

        const spec = await buildSpecV3(metadata, { consumes: ['application/vnd.doc+json'] });

        expect(Object.keys(spec.paths['/roles'].post!.requestBody!.content)).toEqual(['multipart/form-data']);
    });

    it('should use x-www-form-urlencoded for a form body without a file', async () => {
        const metadata = buildMetadata({
            parameters: [
                createParameter({
                    name: 'name',
                    in: 'formData',
                    type: stringType(),
                }),
            ],
        });

        const spec = await buildSpecV3(metadata);

        expect(Object.keys(spec.paths['/roles'].post!.requestBody!.content))
            .toEqual(['application/x-www-form-urlencoded']);
    });

    it('should let an explicit consumes override the form-data default', async () => {
        const metadata = buildMetadata({
            consumes: ['application/x-custom'],
            parameters: [
                createParameter({
                    name: 'name',
                    in: 'formData',
                    type: stringType(),
                }),
            ],
        });

        const spec = await buildSpecV3(metadata);

        expect(Object.keys(spec.paths['/roles'].post!.requestBody!.content)).toEqual(['application/x-custom']);
    });

    it('should let the response level produces win over the method produces', async () => {
        const metadata = buildMetadata({
            produces: ['application/vnd.method+json'],
            responses: [
                createResponse({
                    status: '200',
                    description: 'Ok',
                    schema: refObjectType('Role'),
                    produces: ['application/vnd.res+json'],
                }),
                createResponse({
                    status: '404',
                    description: 'Not Found',
                    schema: refObjectType('Role'),
                }),
            ],
        });

        const spec = await buildSpecV3(metadata);

        const { responses } = spec.paths['/roles'].post!;

        expect(Object.keys(responses['200'].content!)).toEqual(['application/vnd.res+json']);
        expect(Object.keys(responses['404'].content!)).toEqual(['application/vnd.method+json']);
    });

    it('should not let the document level consumes leak into the v2 operation', async () => {
        const metadata = buildMetadata({});
        metadata.controllers[0]!.methods.push(createMethod({
            name: 'getMany',
            method: 'get',
            path: '',
            responses: [createResponse({ status: '200', description: 'Ok' })],
        }));

        const spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: {
                servers: 'http://localhost:3000/',
                consumes: ['application/vnd.doc+json'],
            },
        }) as SpecV2;

        expect(spec.paths['/roles'].post!.consumes).toEqual(['application/json']);
        expect(spec.paths['/roles'].get!.consumes).toEqual([]);
    });

    // The TypeScript resolver emits `buffer` for an upload parameter and never
    // `file`, so resolving the form media type off `file` alone silently
    // demoted every real upload to x-www-form-urlencoded.
    describe('a Buffer upload parameter is a file', () => {
        function buildUploadMetadata() {
            return buildMetadata({
                parameters: [
                    createParameter({
                        name: 'avatar',
                        in: 'formData',
                        type: bufferType(),
                    }),
                ],
            });
        }

        it('V3: keeps multipart/form-data', async () => {
            const spec = await buildSpecV3(buildUploadMetadata());

            expect(Object.keys(spec.paths['/roles'].post!.requestBody!.content))
                .toEqual(['multipart/form-data']);
        });

        it('V2: keeps multipart/form-data', async () => {
            const spec = await generateSwagger({
                version: Version.V2,
                metadata: buildUploadMetadata(),
                data: { servers: 'http://localhost:3000/' },
            }) as SpecV2;

            expect(spec.paths['/roles'].post!.consumes).toEqual(['multipart/form-data']);
        });
    });

    // V2 used to hand its operation the metadata's own `consumes` array and push
    // into it, so generating V2 first rewrote the metadata every later target saw.
    describe('generation does not mutate the metadata it was given', () => {
        it('leaves method.consumes untouched', async () => {
            const metadata = buildMetadata({
                parameters: [
                    createParameter({
                        name: 'name',
                        in: 'formData',
                        type: stringType(),
                    }),
                ],
            });

            await generateSwagger({
                version: Version.V2,
                metadata,
                data: { servers: 'http://localhost:3000/' },
            });

            expect(metadata.controllers[0]!.methods[0]!.consumes).toEqual([]);
        });

        it('emits the same V3 document whether or not a V2 document was generated first', async () => {
            const parameters = [
                createParameter({
                    name: 'name',
                    in: 'formData',
                    type: stringType(),
                }),
            ];

            const alone = await buildSpecV3(buildMetadata({ parameters }));

            const shared = buildMetadata({ parameters });
            await generateSwagger({
                version: Version.V2,
                metadata: shared,
                data: { servers: 'http://localhost:3000/' },
            });
            const afterV2 = await buildSpecV3(shared);

            expect(Object.keys(afterV2.paths['/roles'].post!.requestBody!.content))
                .toEqual(['application/x-www-form-urlencoded']);
            expect(afterV2).toEqual(alone);
        });
    });
});
