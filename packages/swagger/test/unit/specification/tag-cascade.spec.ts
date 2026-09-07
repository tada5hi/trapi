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
import type { SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createResponse,
} from '../../helpers/metadata-builder';

const V3_VERSIONS = [Version.V3, Version.V3_1, Version.V3_2] as const;

function buildSpec(metadata: Metadata, version: `${Version}`): Promise<SpecV3> {
    return generateSwagger({
        version,
        metadata,
        data: { servers: 'http://localhost:3000/' },
    }) as Promise<SpecV3>;
}

function taggedMetadata() : Metadata {
    return createMetadata([
        createController({
            name: 'RoleController',
            paths: ['roles'],
            tags: ['role'],
            methods: [
                createMethod({
                    name: 'getMany',
                    method: 'get',
                    path: '',
                    tags: [],
                    responses: [createResponse({ status: '200', description: 'Ok' })],
                }),
                createMethod({
                    name: 'getSummary',
                    method: 'get',
                    path: 'summary',
                    tags: ['role', 'extra'],
                    responses: [createResponse({ status: '200', description: 'Ok' })],
                }),
            ],
        }),
    ]);
}

function untaggedMetadata() : Metadata {
    return createMetadata([
        createController({
            name: 'RoleController',
            paths: ['roles'],
            methods: [
                createMethod({
                    name: 'getMany',
                    method: 'get',
                    path: '',
                    responses: [createResponse({ status: '200', description: 'Ok' })],
                }),
            ],
        }),
    ]);
}

function responseMetadata(methodResponses: Response[]) : Metadata {
    return createMetadata([
        createController({
            name: 'RoleController',
            paths: ['roles'],
            responses: [
                createResponse({ status: '401', description: 'Unauthorized.' }),
                createResponse({ status: '200', description: 'CONTROLLER 200' }),
            ],
            methods: [
                createMethod({
                    name: 'getMany',
                    method: 'get',
                    path: '',
                    responses: methodResponses,
                }),
            ],
        }),
    ]);
}

describe('controller -> method tag cascade (#894)', () => {
    describe.each(V3_VERSIONS)('%s', (version) => {
        it('should cascade controller tags onto an untagged operation', async () => {
            const spec = await buildSpec(taggedMetadata(), version);

            expect(spec.paths['/roles'].get!.tags).toEqual(['role']);
        });

        it('should merge controller and method tags without duplicates', async () => {
            const spec = await buildSpec(taggedMetadata(), version);

            expect(spec.paths['/roles/summary'].get!.tags).toEqual(['role', 'extra']);
        });

        it('should omit the operation tags key when neither controller nor method is tagged', async () => {
            const spec = await buildSpec(untaggedMetadata(), version);

            expect(spec.paths['/roles'].get!).not.toHaveProperty('tags');
        });

        it('should omit the root tags key when no controller declares extensions', async () => {
            const spec = await buildSpec(taggedMetadata(), version);

            expect(spec).not.toHaveProperty('tags');
        });

        it('should emit the root tags key when a controller declares extensions', async () => {
            const metadata = createMetadata([
                createController({
                    name: 'RoleController',
                    paths: ['roles'],
                    tags: ['role'],
                    extensions: [{ key: 'x-owner', value: 'core-team' }],
                    methods: [
                        createMethod({
                            name: 'getMany',
                            method: 'get',
                            path: '',
                            responses: [createResponse({ status: '200', description: 'Ok' })],
                        }),
                    ],
                }),
            ]);

            const spec = await buildSpec(metadata, version);

            expect(spec.tags).toEqual([{ name: 'role', 'x-owner': 'core-team' }]);
        });

        it('should merge controller responses into the operation', async () => {
            const metadata = responseMetadata([
                createResponse({ status: '204', description: 'No Content' }),
            ]);

            const spec = await buildSpec(metadata, version);
            const { responses } = spec.paths['/roles'].get!;

            expect(Object.keys(responses).sort()).toEqual(['200', '204', '401']);
            expect(responses['401'].description).toEqual('Unauthorized.');
            expect(responses['200'].description).toEqual('CONTROLLER 200');
        });

        it('should let the method response win when it collides with a controller response', async () => {
            const metadata = responseMetadata([
                createResponse({ status: '200', description: 'METHOD 200' }),
            ]);

            const spec = await buildSpec(metadata, version);
            const { responses } = spec.paths['/roles'].get!;

            expect(Object.keys(responses).sort()).toEqual(['200', '401']);
            expect(responses['200'].description).toEqual('METHOD 200');
        });
    });

    // Both emitters cascade by mutating the shared `Metadata` in place, and the CLI
    // emits every target in a group from one metadata object — so a second pass must
    // not accumulate duplicate tags or responses.
    it('should stay idempotent when one metadata object is emitted repeatedly', async () => {
        const metadata = taggedMetadata();

        const first = await buildSpec(metadata, Version.V3_2);
        // a v2 target can sit between two v3 targets; it cascades over the same object.
        await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        const second = await buildSpec(metadata, Version.V3_2);

        expect(second).toEqual(first);
        expect(second.paths['/roles/summary'].get!.tags).toEqual(['role', 'extra']);
        expect(Object.keys(second.paths['/roles'].get!.responses)).toEqual(['200']);
    });
});
