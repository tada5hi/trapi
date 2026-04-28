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
            paths: ['tagged'],
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
            paths: ['shared'],
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
            paths: ['plain'],
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

describe('controller extensions without declared tags', () => {
    const metadata = createMetadata([
        createController({
            name: 'UntaggedController',
            paths: ['untagged'],
            tags: [],
            extensions: [{ key: 'x-fallback', value: 'value' }],
            methods: [
                createMethod({
                    name: 'list',
                    method: 'get',
                    path: '',
                    responses: [createResponse({ status: '204', schema: voidType() })],
                }),
            ],
        }),
    ]);

    it('falls back to the controller name as the tag entry name (V2)', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        const entry = (spec.tags ?? []).find((t) => t.name === 'UntaggedController');
        expect(entry).toBeDefined();
        expect((entry as Record<string, unknown>)['x-fallback']).toEqual('value');
    });

    it('falls back to the controller name as the tag entry name (V3)', async () => {
        const spec = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        const entry = (spec.tags ?? []).find((t) => t.name === 'UntaggedController');
        expect(entry).toBeDefined();
        expect((entry as Record<string, unknown>)['x-fallback']).toEqual('value');
    });
});

describe('hidden controllers and methods', () => {
    const metadata = createMetadata([
        createController({
            name: 'HiddenController',
            paths: ['hidden-controller'],
            hidden: true,
            tags: ['hidden-tag'],
            extensions: [{ key: 'x-hidden', value: 'should-not-appear' }],
            methods: [
                createMethod({
                    name: 'list',
                    method: 'get',
                    path: '',
                    responses: [createResponse({ status: '204', schema: voidType() })],
                }),
            ],
        }),
        createController({
            name: 'PartiallyHiddenController',
            paths: ['partial'],
            tags: ['partial'],
            methods: [
                createMethod({
                    name: 'visible',
                    method: 'get',
                    path: 'visible',
                    responses: [createResponse({ status: '204', schema: voidType() })],
                }),
                createMethod({
                    name: 'invisible',
                    method: 'get',
                    path: 'invisible',
                    hidden: true,
                    responses: [createResponse({ status: '204', schema: voidType() })],
                }),
            ],
        }),
    ]);

    it('skips hidden controllers in the path output (V2)', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        expect(Object.keys(spec.paths)).not.toContain('/hidden-controller');
    });

    it('skips hidden controllers in the path output (V3)', async () => {
        const spec = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        expect(Object.keys(spec.paths)).not.toContain('/hidden-controller');
    });

    it('skips hidden controllers when building tag entries (V2)', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        const entry = (spec.tags ?? []).find((t) => t.name === 'hidden-tag');
        expect(entry).toBeUndefined();
    });

    it('skips hidden controllers when building tag entries (V3)', async () => {
        const spec = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        const entry = (spec.tags ?? []).find((t) => t.name === 'hidden-tag');
        expect(entry).toBeUndefined();
    });

    it('skips hidden methods but keeps visible siblings (V2)', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        expect(spec.paths['/partial/visible']).toBeDefined();
        expect(spec.paths['/partial/invisible']).toBeUndefined();
    });

    it('skips hidden methods but keeps visible siblings (V3)', async () => {
        const spec = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        expect(spec.paths['/partial/visible']).toBeDefined();
        expect(spec.paths['/partial/invisible']).toBeUndefined();
    });
});

describe('extensions never overwrite reserved fields', () => {
    const metadata = createMetadata([
        createController({
            name: 'GuardedController',
            paths: ['guarded'],
            tags: ['guarded'],
            // 'name' would collide with Tag.name without the x- prefix guard
            extensions: [{ key: 'name', value: 'should-not-overwrite' }],
            methods: [
                createMethod({
                    name: 'list',
                    method: 'get',
                    path: '',
                    responses: [createResponse({ status: '204', schema: voidType() })],
                    parameters: [
                        createParameter({
                            name: 'filter',
                            in: 'queryProp',
                            type: stringType(),
                            // 'in', 'required', 'name' would collide with parameter fields
                            extensions: [
                                { key: 'in', value: 'should-not-overwrite' },
                                { key: 'required', value: 'should-not-overwrite' },
                                { key: 'custom', value: 'gets-prefixed' },
                            ],
                        }),
                    ],
                }),
            ],
        }),
    ]);

    it('preserves Tag.name and applies extensions under x-prefixed keys (V2)', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        const tag = (spec.tags ?? []).find((t) => t.name === 'guarded');
        expect(tag).toBeDefined();
        expect(tag!.name).toEqual('guarded');
        expect((tag as Record<string, unknown>)['x-name']).toEqual('should-not-overwrite');
    });

    it('preserves Tag.name and applies extensions under x-prefixed keys (V3)', async () => {
        const spec = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        const tag = (spec.tags ?? []).find((t) => t.name === 'guarded');
        expect(tag).toBeDefined();
        expect(tag!.name).toEqual('guarded');
        expect((tag as Record<string, unknown>)['x-name']).toEqual('should-not-overwrite');
    });

    it('preserves reserved parameter fields and prefixes non-x- extension keys (V2)', async () => {
        const spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        const operation = spec.paths['/guarded'].get!;
        const param = (operation.parameters ?? []).find((p) => (p as { name?: string }).name === 'filter');
        expect(param).toBeDefined();
        const record = param as unknown as Record<string, unknown>;
        // reserved fields preserved
        expect(record.name).toEqual('filter');
        expect(record.in).toEqual('query');
        expect(record.required).toEqual(true);
        // non-x- keys auto-prefixed
        expect(record['x-in']).toEqual('should-not-overwrite');
        expect(record['x-required']).toEqual('should-not-overwrite');
        expect(record['x-custom']).toEqual('gets-prefixed');
    });

    it('preserves reserved parameter fields and prefixes non-x- extension keys (V3)', async () => {
        const spec = await generateSwagger({
            version: Version.V3,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
        const operation = spec.paths['/guarded'].get!;
        const param = (operation.parameters ?? []).find((p) => (p as { name?: string }).name === 'filter');
        expect(param).toBeDefined();
        const record = param as unknown as Record<string, unknown>;
        expect(record.name).toEqual('filter');
        expect(record.in).toEqual('query');
        expect(record.required).toEqual(true);
        expect(record['x-in']).toEqual('should-not-overwrite');
        expect(record['x-required']).toEqual('should-not-overwrite');
        expect(record['x-custom']).toEqual('gets-prefixed');
    });
});
