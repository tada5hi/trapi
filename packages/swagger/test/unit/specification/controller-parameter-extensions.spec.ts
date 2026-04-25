/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { SpecV2, SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';
import {
    createController,
    createMetadata,
    createMethod,
    createParameter,
    createResponse,
    stringType,
    voidType,
} from '../../helpers/metadata-builder';

/**
 * Vendor extensions (`x-*`) declared on a controller surface as keys on the
 * matching top-level Tag entry, and extensions on a parameter surface inline
 * on the parameter object.
 */
describe('controller and parameter extensions', () => {
    let specV2: SpecV2;
    let specV3: SpecV3;

    const metadata = createMetadata([
        createController({
            name: 'TaggedController',
            path: 'tagged',
            tags: ['tagged', 'shared'],
            extensions: [
                { key: 'x-controller', value: 'controller-value' },
                { key: 'x-controller-meta', value: { team: 'platform' } },
            ],
            methods: [
                createMethod({
                    name: 'list',
                    method: 'get',
                    path: '',
                    tags: ['tagged'],
                    responses: [createResponse({ status: '204', schema: voidType() })],
                    parameters: [
                        createParameter({
                            name: 'filter',
                            in: 'queryProp',
                            type: stringType(),
                            extensions: [{ key: 'x-param', value: 'param-value' }],
                        }),
                    ],
                }),
            ],
        }),
        createController({
            name: 'SharedController',
            path: 'shared',
            tags: ['shared'],
            extensions: [{ key: 'x-controller', value: 'shared-value' }],
            methods: [
                createMethod({
                    name: 'list',
                    method: 'get',
                    path: '',
                    tags: ['shared'],
                    responses: [createResponse({ status: '204', schema: voidType() })],
                }),
            ],
        }),
        createController({
            name: 'PlainController',
            path: 'plain',
            tags: ['plain'],
            methods: [
                createMethod({
                    name: 'list',
                    method: 'get',
                    path: '',
                    tags: ['plain'],
                    responses: [createResponse({ status: '204', schema: voidType() })],
                }),
            ],
        }),
    ]);

    beforeAll(async () => {
        specV2 = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });

        specV3 = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
    });

    describe('V2', () => {
        it('emits a tag entry per declared tag of a controller with extensions', () => {
            const tagNames = (specV2.tags ?? []).map((t) => t.name).sort();
            expect(tagNames).toEqual(['shared', 'tagged']);
        });

        it('attaches controller extensions to the matching tag entry', () => {
            const tagged = (specV2.tags ?? []).find((t) => t.name === 'tagged');
            expect(tagged).toBeDefined();
            const taggedRecord = tagged as Record<string, unknown>;
            expect(taggedRecord['x-controller']).toEqual('controller-value');
            expect(taggedRecord['x-controller-meta']).toEqual({ team: 'platform' });
        });

        it('merges extensions across controllers sharing a tag (last write wins)', () => {
            const shared = (specV2.tags ?? []).find((t) => t.name === 'shared');
            expect(shared).toBeDefined();
            expect((shared as Record<string, unknown>)['x-controller']).toEqual('shared-value');
        });

        it('does not emit a tag entry for controllers without extensions', () => {
            const plain = (specV2.tags ?? []).find((t) => t.name === 'plain');
            expect(plain).toBeUndefined();
        });

        it('emits parameter extensions inline on the parameter object', () => {
            const operation = specV2.paths['/tagged'].get!;
            const param = (operation.parameters ?? []).find((p) => (p as { name?: string }).name === 'filter');
            expect(param).toBeDefined();
            expect((param as unknown as Record<string, unknown>)['x-param']).toEqual('param-value');
        });
    });

    describe('V3', () => {
        it('emits a tag entry per declared tag of a controller with extensions', () => {
            const tagNames = (specV3.tags ?? []).map((t) => t.name).sort();
            expect(tagNames).toEqual(['shared', 'tagged']);
        });

        it('attaches controller extensions to the matching tag entry', () => {
            const tagged = (specV3.tags ?? []).find((t) => t.name === 'tagged');
            expect(tagged).toBeDefined();
            const taggedRecord = tagged as Record<string, unknown>;
            expect(taggedRecord['x-controller']).toEqual('controller-value');
            expect(taggedRecord['x-controller-meta']).toEqual({ team: 'platform' });
        });

        it('merges extensions across controllers sharing a tag (last write wins)', () => {
            const shared = (specV3.tags ?? []).find((t) => t.name === 'shared');
            expect(shared).toBeDefined();
            expect((shared as Record<string, unknown>)['x-controller']).toEqual('shared-value');
        });

        it('does not emit a tag entry for controllers without extensions', () => {
            const plain = (specV3.tags ?? []).find((t) => t.name === 'plain');
            expect(plain).toBeUndefined();
        });

        it('emits parameter extensions inline on the parameter object', () => {
            const operation = specV3.paths['/tagged'].get!;
            const param = (operation.parameters ?? []).find((p) => (p as { name?: string }).name === 'filter');
            expect(param).toBeDefined();
            expect((param as unknown as Record<string, unknown>)['x-param']).toEqual('param-value');
        });
    });
});
