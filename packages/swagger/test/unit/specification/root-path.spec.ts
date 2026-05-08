/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createResponse,
} from '../../helpers/metadata-builder';

const servers = [{ url: '/' }];

// Regression test for issue #835: root-route combinations
// (controller='' + method='/', controller='/' + method='', controller='/'
// + method='/') previously emitted '' as a paths key, which strict OpenAPI
// validators reject (§4.8.8 requires every paths key to start with '/').
describe('root path emission', () => {
    const cases: Array<{
        controller: string; 
        method: string; 
        label: string 
    }> = [
        {
            controller: '', 
            method: '/', 
            label: "@Controller('') + @Get('/')", 
        },
        {
            controller: '/', 
            method: '', 
            label: "@Controller('/') + @Get('')", 
        },
        {
            controller: '/', 
            method: '/', 
            label: "@Controller('/') + @Get('/')", 
        },
        {
            controller: '', 
            method: '', 
            label: "@Controller('') + @Get('')", 
        },
    ];

    for (const {
        controller, 
        method, 
        label, 
    } of cases) {
        describe(label, () => {
            const metadata = createMetadata([
                createController({
                    name: 'RootController',
                    paths: [controller],
                    methods: [
                        createMethod({
                            name: 'status',
                            method: 'get',
                            path: method,
                            responses: [createResponse({ status: '200' })],
                        }),
                    ],
                }),
            ]);

            it('emits "/" for v3', async () => {
                const spec = await generateSwagger({
                    version: Version.V3,
                    metadata,
                    data: { servers },
                });
                expect(Object.keys(spec.paths)).toEqual(['/']);
            });

            it('emits "/" for v2', async () => {
                const spec = await generateSwagger({
                    version: Version.V2,
                    metadata,
                    data: { servers },
                });
                expect(Object.keys(spec.paths)).toEqual(['/']);
            });
        });
    }

    it('does not collapse non-root paths to "/"', async () => {
        const metadata = createMetadata([
            createController({
                name: 'EventsController',
                paths: ['/events'],
                methods: [
                    createMethod({
                        name: 'list',
                        method: 'get',
                        path: '/',
                        responses: [createResponse({ status: '200' })],
                    }),
                ],
            }),
        ]);

        const v3 = await generateSwagger({
            version: Version.V3, 
            metadata, 
            data: { servers }, 
        });
        expect(Object.keys(v3.paths)).toEqual(['/events']);

        const v2 = await generateSwagger({
            version: Version.V2, 
            metadata, 
            data: { servers }, 
        });
        expect(Object.keys(v2.paths)).toEqual(['/events']);
    });

    it('keeps root and non-root operations separate in the same document', async () => {
        const metadata = createMetadata([
            createController({
                name: 'RootController',
                paths: [''],
                methods: [
                    createMethod({
                        name: 'status',
                        method: 'get',
                        path: '/',
                        responses: [createResponse({ status: '200' })],
                    }),
                ],
            }),
            createController({
                name: 'EventsController',
                paths: ['/events'],
                methods: [
                    createMethod({
                        name: 'list',
                        method: 'get',
                        path: '',
                        responses: [createResponse({ status: '200' })],
                    }),
                ],
            }),
        ]);

        const spec = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers },
        });
        expect(Object.keys(spec.paths).sort()).toEqual(['/', '/events']);
    });
});
