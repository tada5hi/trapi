/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    CACHE_SCHEMA_VERSION,
    CacheClient,
    composeCacheKey,
    hashCompilerOptions,
    hashRegistry,
} from '../../src';

function uniqueDir(label: string): string {
    return path.join(os.tmpdir(), `trapi-cache-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

async function rmrf(p: string): Promise<void> {
    await fs.promises.rm(p, { recursive: true, force: true });
}

describe('src/cache', () => {
    describe('save and get', () => {
        let dir: string;

        beforeEach(() => { dir = uniqueDir('save-get'); });
        afterEach(async () => { await rmrf(dir); });

        it('saves and retrieves cache by key', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'key-empty',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });

            expect(cachePath).toBeDefined();
            expect(fs.existsSync(cachePath!)).toBe(true);

            const output = await cache.get('key-empty');
            expect(output).toBeDefined();
            expect(output!.cacheKey).toEqual('key-empty');
            expect(output!.schemaVersion).toEqual(CACHE_SCHEMA_VERSION);
            expect(output!.controllers).toEqual([]);
        });

        it('preserves controllers and reference types', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            await cache.save({
                controllers: [{
                    consumes: [],
                    extensions: [],
                    hidden: false,
                    location: '/test.ts',
                    methods: [],
                    name: 'TestController',
                    path: 'test',
                    produces: [],
                    responses: [],
                    security: [],
                    tags: [],
                }],
                referenceTypes: {
                    TestType: {
                        typeName: 'refObject',
                        refName: 'TestType',
                        properties: [],
                        deprecated: false,
                    },
                },
                cacheKey: 'key-shape',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });

            const output = await cache.get('key-shape');
            expect(output).toBeDefined();
            expect(output!.controllers).toHaveLength(1);
            expect(output!.controllers[0].name).toEqual('TestController');
            expect(output!.referenceTypes).toHaveProperty('TestType');
        });

        it('returns different entries for different cache keys', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            await cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'key-a',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });
            await cache.save({
                controllers: [{
                    consumes: [],
                    extensions: [],
                    hidden: false,
                    location: '/a.ts',
                    methods: [],
                    name: 'A',
                    path: 'a',
                    produces: [],
                    responses: [],
                    security: [],
                    tags: [],
                }],
                referenceTypes: {},
                cacheKey: 'key-b',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });

            const a = await cache.get('key-a');
            const b = await cache.get('key-b');
            expect(a!.controllers).toHaveLength(0);
            expect(b!.controllers).toHaveLength(1);
        });
    });

    describe('disabled cache', () => {
        it('does not save when disabled with false', async () => {
            const cache = new CacheClient(false);
            const result = await cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'k',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });
            expect(result).toBeUndefined();
        });

        it('does not get when disabled', async () => {
            const cache = new CacheClient(false);
            const result = await cache.get('k');
            expect(result).toBeUndefined();
        });

        it('does not save when disabled via options', async () => {
            const cache = new CacheClient({ enabled: false });
            const result = await cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'k',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });
            expect(result).toBeUndefined();
        });
    });

    describe('cacheKey validation (path-traversal hardening)', () => {
        let dir: string;
        beforeEach(() => { dir = uniqueDir('traverse'); });
        afterEach(async () => { await rmrf(dir); });

        const malicious = [
            '../escape',
            '..',
            '/abs/path',
            'foo/bar',
            'foo\\bar',
            'foo.bar',
            'foo\0bar',
            '',
            // Over the 128-char ceiling
            'a'.repeat(129),
        ];

        for (const key of malicious) {
            it(`rejects malicious cacheKey on save: ${JSON.stringify(key)}`, async () => {
                const cache = new CacheClient({ enabled: true, directoryPath: dir });
                await expect(cache.save({
                    controllers: [],
                    referenceTypes: {},
                    cacheKey: key,
                    schemaVersion: CACHE_SCHEMA_VERSION,
                })).rejects.toThrow(/cacheKey/);
            });

            it(`rejects malicious cacheKey on get: ${JSON.stringify(key)}`, async () => {
                const cache = new CacheClient({ enabled: true, directoryPath: dir });
                await expect(cache.get(key)).rejects.toThrow(/cacheKey/);
            });
        }

        it('accepts a sha256 hex digest (the canonical caller)', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });
            const hexKey = 'a'.repeat(64);
            await expect(cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: hexKey,
                schemaVersion: CACHE_SCHEMA_VERSION,
            })).resolves.toBeDefined();
        });
    });

    describe('cache miss', () => {
        let dir: string;
        beforeEach(() => { dir = uniqueDir('miss'); });
        afterEach(async () => { await rmrf(dir); });

        it('returns undefined for missing entry', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });
            const out = await cache.get('never-saved');
            expect(out).toBeUndefined();
        });

        it('returns undefined when stored cacheKey does not match expected', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            // Tamper: write a file at the path for `key-x` whose payload
            // claims to be `key-y` — the cross-check must reject.
            await fs.promises.mkdir(dir, { recursive: true });
            const filePath = path.join(dir, '.trapi-metadata-key-x.json');
            await fs.promises.writeFile(filePath, JSON.stringify({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'key-y',
                schemaVersion: CACHE_SCHEMA_VERSION,
            }));

            const out = await cache.get('key-x');
            expect(out).toBeUndefined();
        });

        it('returns undefined and removes the file when JSON is corrupt', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            await fs.promises.mkdir(dir, { recursive: true });
            const filePath = path.join(dir, '.trapi-metadata-key-corrupt.json');
            await fs.promises.writeFile(filePath, '{ not valid json');

            const out = await cache.get('key-corrupt');
            expect(out).toBeUndefined();
            expect(fs.existsSync(filePath)).toBe(false);
        });

        it('rejects entries with a stale schemaVersion', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            await fs.promises.mkdir(dir, { recursive: true });
            const filePath = path.join(dir, '.trapi-metadata-key-old.json');
            await fs.promises.writeFile(filePath, JSON.stringify({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'key-old',
                schemaVersion: 'ancient',
            }));

            const out = await cache.get('key-old');
            expect(out).toBeUndefined();
        });
    });

    describe('constructor inputs', () => {
        it('accepts a string directory path', async () => {
            const dir = uniqueDir('str');
            try {
                const cache = new CacheClient(dir);
                const cachePath = await cache.save({
                    controllers: [],
                    referenceTypes: {},
                    cacheKey: 'k',
                    schemaVersion: CACHE_SCHEMA_VERSION,
                });
                expect(cachePath!.startsWith(dir)).toBe(true);
            } finally {
                await rmrf(dir);
            }
        });

        it('accepts boolean true to enable with default directory', async () => {
            const cache = new CacheClient(true);
            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'k-default',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });
            expect(cachePath).toBeDefined();
            await fs.promises.unlink(cachePath!).catch(() => undefined);
        });

        it('accepts a custom fileName', async () => {
            const dir = uniqueDir('fn');
            try {
                const cache = new CacheClient({
                    enabled: true,
                    directoryPath: dir,
                    fileName: 'custom-cache.json',
                });
                const cachePath = await cache.save({
                    controllers: [],
                    referenceTypes: {},
                    cacheKey: 'k',
                    schemaVersion: CACHE_SCHEMA_VERSION,
                });
                expect(cachePath!.endsWith('custom-cache.json')).toBe(true);
            } finally {
                await rmrf(dir);
            }
        });

        it('auto-creates the directory if missing', async () => {
            const dir = uniqueDir('mkdir');
            // Don't create it — the cache should.
            try {
                const cache = new CacheClient({ enabled: true, directoryPath: dir });
                const cachePath = await cache.save({
                    controllers: [],
                    referenceTypes: {},
                    cacheKey: 'k',
                    schemaVersion: CACHE_SCHEMA_VERSION,
                });
                expect(fs.existsSync(dir)).toBe(true);
                expect(fs.existsSync(cachePath!)).toBe(true);
            } finally {
                await rmrf(dir);
            }
        });
    });

    describe('eviction', () => {
        let dir: string;
        beforeEach(() => { dir = uniqueDir('evict'); });
        afterEach(async () => { await rmrf(dir); });

        it('removes files older than maxAgeMs on evict()', async () => {
            const cache = new CacheClient({
                enabled: true,
                directoryPath: dir,
                maxAgeMs: 1000,
            });

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'k-old',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });
            expect(cachePath).toBeDefined();

            // Backdate the file so it appears stale.
            const past = (Date.now() - 60_000) / 1000;
            await fs.promises.utimes(cachePath!, past, past);

            await cache.evict();
            expect(fs.existsSync(cachePath!)).toBe(false);
        });

        it('keeps fresh files on evict()', async () => {
            const cache = new CacheClient({
                enabled: true,
                directoryPath: dir,
                maxAgeMs: 60_000,
            });

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'k-fresh',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });

            await cache.evict();
            expect(fs.existsSync(cachePath!)).toBe(true);
        });

        it('is a no-op when maxAgeMs is 0', async () => {
            const cache = new CacheClient({
                enabled: true,
                directoryPath: dir,
                maxAgeMs: 0,
            });

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'k-disabled',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });

            // Backdate
            const past = (Date.now() - 60_000) / 1000;
            await fs.promises.utimes(cachePath!, past, past);

            await cache.evict();
            expect(fs.existsSync(cachePath!)).toBe(true);
        });
    });

    describe('cycle-safe serialization', () => {
        let dir: string;
        beforeEach(() => { dir = uniqueDir('cycle'); });
        afterEach(async () => { await rmrf(dir); });

        it('round-trips an object containing a self-reference', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            const data: any = {
                controllers: [],
                referenceTypes: {},
                cacheKey: 'k-cycle-self',
                schemaVersion: CACHE_SCHEMA_VERSION,
            };
            data.self = data;

            const cachePath = await cache.save(data);
            expect(cachePath).toBeDefined();

            const restored = await cache.get('k-cycle-self') as any;
            expect(restored).toBeDefined();
            // The cycle is preserved on read — `restored.self` is the
            // restored object, not undefined or a stripped subtree.
            expect(restored.self).toBe(restored);
        });

        it('round-trips a back-edge between reference types', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            const typeA: any = {
                typeName: 'refObject',
                refName: 'A',
                properties: [],
                deprecated: false,
            };
            const typeB: any = {
                typeName: 'refObject',
                refName: 'B',
                properties: [],
                deprecated: false,
            };
            // Hypothetical in-place back-edge (not how real metadata is shaped,
            // but defensively supported).
            typeA.partner = typeB;
            typeB.partner = typeA;

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: { A: typeA, B: typeB },
                cacheKey: 'k-cycle-pair',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });
            expect(cachePath).toBeDefined();

            const restored = await cache.get('k-cycle-pair') as any;
            expect(restored).toBeDefined();
            expect(restored.referenceTypes.A.partner).toBe(restored.referenceTypes.B);
            expect(restored.referenceTypes.B.partner).toBe(restored.referenceTypes.A);
        });
    });

    describe('atomic write', () => {
        let dir: string;
        beforeEach(() => { dir = uniqueDir('atomic'); });
        afterEach(async () => { await rmrf(dir); });

        it('does not leave .tmp files behind on success', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            await cache.save({
                controllers: [],
                referenceTypes: {},
                cacheKey: 'k',
                schemaVersion: CACHE_SCHEMA_VERSION,
            });

            const entries = await fs.promises.readdir(dir);
            expect(entries.some((f) => f.endsWith('.tmp'))).toBe(false);
        });

        it('survives concurrent saves of the same key', async () => {
            const cache = new CacheClient({ enabled: true, directoryPath: dir });

            const data = {
                controllers: [],
                referenceTypes: {},
                cacheKey: 'k-concurrent',
                schemaVersion: CACHE_SCHEMA_VERSION,
            };

            await Promise.all([
                cache.save(data),
                cache.save(data),
                cache.save(data),
                cache.save(data),
            ]);

            const out = await cache.get('k-concurrent');
            expect(out).toBeDefined();

            // No leftover tmp files
            const entries = await fs.promises.readdir(dir);
            expect(entries.filter((f) => f.endsWith('.tmp'))).toEqual([]);
        });
    });

    describe('composeCacheKey', () => {
        it('produces a stable hex digest', () => {
            const a = composeCacheKey({
                schemaVersion: '2',
                sourceFilesHash: 'src',
                compilerOptionsHash: 'opt',
                registryHash: 'reg',
                presetName: 'p',
            });
            const b = composeCacheKey({
                schemaVersion: '2',
                sourceFilesHash: 'src',
                compilerOptionsHash: 'opt',
                registryHash: 'reg',
                presetName: 'p',
            });
            expect(a).toEqual(b);
            expect(a).toMatch(/^[0-9a-f]{64}$/);
        });

        it('changes when any contributor changes', () => {
            const base = {
                schemaVersion: '2',
                sourceFilesHash: 'src',
                compilerOptionsHash: 'opt',
                registryHash: 'reg',
                presetName: 'p',
            };
            const variants = [
                { ...base, schemaVersion: '3' },
                { ...base, sourceFilesHash: 'src2' },
                { ...base, compilerOptionsHash: 'opt2' },
                { ...base, registryHash: 'reg2' },
                { ...base, presetName: 'p2' },
            ];
            const baseKey = composeCacheKey(base);
            for (const v of variants) {
                expect(composeCacheKey(v)).not.toEqual(baseKey);
            }
        });
    });

    describe('hashCompilerOptions', () => {
        it('is stable across key insertion order', () => {
            const a = hashCompilerOptions({ target: 99, strict: true });
            const b = hashCompilerOptions({ strict: true, target: 99 } as any);
            expect(a).toEqual(b);
        });

        it('changes when an option changes', () => {
            const a = hashCompilerOptions({ strict: true });
            const b = hashCompilerOptions({ strict: false });
            expect(a).not.toEqual(b);
        });
    });

    describe('hashRegistry', () => {
        const emptyRegistry = {
            controllers: [],
            methods: [],
            parameters: [],
            controllerJsDoc: [],
            methodJsDoc: [],
            parameterJsDoc: [],
        };

        it('produces a stable digest for empty registry', () => {
            expect(hashRegistry(emptyRegistry)).toEqual(hashRegistry(emptyRegistry));
        });

        it('changes when a handler is added', () => {
            const empty = hashRegistry(emptyRegistry);
            const populated = hashRegistry({
                ...emptyRegistry,
                controllers: [{
                    match: { name: 'Controller', on: 'class' },
                    apply: () => undefined,
                } as any],
            });
            expect(empty).not.toEqual(populated);
        });

        it('changes when a handler match name changes', () => {
            const a = hashRegistry({
                ...emptyRegistry,
                controllers: [{
                    match: { name: 'Controller', on: 'class' },
                    apply: () => undefined,
                } as any],
            });
            const b = hashRegistry({
                ...emptyRegistry,
                controllers: [{
                    match: { name: 'Route', on: 'class' },
                    apply: () => undefined,
                } as any],
            });
            expect(a).not.toEqual(b);
        });

        it('changes when handler apply body changes', () => {
            const a = hashRegistry({
                ...emptyRegistry,
                controllers: [{
                    match: { name: 'Controller', on: 'class' },
                    apply: (_ctx: any, draft: any) => { draft.path = 'a'; },
                } as any],
            });
            const b = hashRegistry({
                ...emptyRegistry,
                controllers: [{
                    match: { name: 'Controller', on: 'class' },
                    apply: (_ctx: any, draft: any) => { draft.path = 'b'; },
                } as any],
            });
            expect(a).not.toEqual(b);
        });
    });
});
