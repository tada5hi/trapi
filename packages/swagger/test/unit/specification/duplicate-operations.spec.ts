/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    stringType,
} from '../../helpers/metadata-builder';

/**
 * A path item may hold at most one operation per HTTP verb, so a second
 * controller emitting the same verb at the same URL silently replaces the
 * first. That is real data loss — the warning is the only trace it leaves.
 */
const VERSIONS = [Version.V2, Version.V3] as const;

describe('duplicate operations', () => {
    const collidingMetadata = () => createMetadata([
        createController({
            name: 'UsersController',
            paths: [''],
            methods: [createMethod({
                name: 'list',
                method: 'get',
                path: '',
                type: stringType(),
            })],
        }),
        createController({
            name: 'RolesController',
            paths: [''],
            methods: [createMethod({
                name: 'list',
                method: 'get',
                path: '',
                type: stringType(),
            })],
        }),
    ]);

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it.each(VERSIONS)('%s should warn when an operation overwrites another at the same path and verb', async (version) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await generateSwagger({ version, metadata: collidingMetadata() });

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]![0]).toContain('duplicate operation GET /');
        expect(warn.mock.calls[0]![0]).toContain('RolesController.list');
    });

    it.each(VERSIONS)('%s should not warn for a multi-mount controller, whose mounts emit distinct urls', async (version) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await generateSwagger({
            version,
            metadata: createMetadata([
                createController({
                    name: 'RolesController',
                    paths: ['roles', 'realms/{realmId}/roles'],
                    methods: [createMethod({
                        name: 'list',
                        method: 'get',
                        path: '',
                        type: stringType(),
                    })],
                }),
            ]),
        });

        expect(warn).not.toHaveBeenCalled();
    });

    it.each(VERSIONS)('%s should not warn when two controllers share a url but differ by verb', async (version) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await generateSwagger({
            version,
            metadata: createMetadata([
                createController({
                    name: 'UsersController',
                    paths: [''],
                    methods: [createMethod({
                        name: 'list',
                        method: 'get',
                        path: '',
                        type: stringType(),
                    })],
                }),
                createController({
                    name: 'RolesController',
                    paths: [''],
                    methods: [createMethod({
                        name: 'create',
                        method: 'post',
                        path: '',
                        type: stringType(),
                    })],
                }),
            ]),
        });

        expect(warn).not.toHaveBeenCalled();
    });
});
