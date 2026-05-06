/*
 * Copyright (c) 2026.
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
import { fileURLToPath } from 'node:url';
import { MetadataGenerator, generateMetadata } from '../../../src';
import type { MetadataGeneratorOptions } from '../../../src';
import { CACHE_FILE_PREFIX } from '../../../src/adapters/cache/constants';

const decoratorEntry = [{
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
    pattern: './test/data/controllers/**/*.ts',
}];

function uniqueDir(label: string): string {
    return path.join(
        os.tmpdir(),
        `trapi-cache-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
}

async function rmrf(p: string): Promise<void> {
    await fs.promises.rm(p, { recursive: true, force: true });
}

async function listCacheFiles(dir: string): Promise<string[]> {
    try {
        const entries = await fs.promises.readdir(dir);
        return entries.filter((f) => f.startsWith(CACHE_FILE_PREFIX));
    } catch {
        return [];
    }
}

// These tests run real `generateMetadata()` passes against the decorators
// fixture, which dwarfs the default 5s vitest timeout on slower CI runners.
// 30s gives comfortable headroom while still failing loudly on a true hang.
const ENDPOINT_TEST_TIMEOUT_MS = 30_000;

describe('cache invalidation — end-to-end through MetadataGenerator', () => {
    let dir: string;
    beforeEach(() => { dir = uniqueDir('inv'); });
    afterEach(async () => { await rmrf(dir); });

    it('hits the cache on a second run with identical inputs', { timeout: ENDPOINT_TEST_TIMEOUT_MS }, async () => {
        const opts = {
            entryPoint: decoratorEntry,
            cache: { enabled: true, directoryPath: dir },
            preset: '@trapi/preset-decorators-express',
        };

        const first = await generateMetadata(opts);
        const filesAfterFirst = await listCacheFiles(dir);
        expect(filesAfterFirst).toHaveLength(1);

        const cachedPath = path.join(dir, filesAfterFirst[0]);
        const mtimeAfterFirst = (await fs.promises.stat(cachedPath)).mtimeMs;

        const second = await generateMetadata(opts);
        const filesAfterSecond = await listCacheFiles(dir);

        // Same inputs → same key → no new file written.
        expect(filesAfterSecond).toHaveLength(1);
        expect(filesAfterSecond[0]).toEqual(filesAfterFirst[0]);

        // mtime should be unchanged because the second run reads, not writes.
        const mtimeAfterSecond = (await fs.promises.stat(cachedPath)).mtimeMs;
        expect(mtimeAfterSecond).toEqual(mtimeAfterFirst);

        // And the metadata returned matches.
        expect(second.controllers.length).toEqual(first.controllers.length);
    });

    it('writes a new entry when the preset name changes', { timeout: ENDPOINT_TEST_TIMEOUT_MS }, async () => {
        await generateMetadata({
            entryPoint: decoratorEntry,
            cache: { enabled: true, directoryPath: dir },
            preset: '@trapi/preset-decorators-express',
        });
        const afterFirst = await listCacheFiles(dir);
        expect(afterFirst).toHaveLength(1);

        // Different preset name → different `presetName` AND different
        // `registryHash` contributor → different cache key → second file.
        await generateMetadata({
            entryPoint: decoratorEntry,
            cache: { enabled: true, directoryPath: dir },
            preset: '@trapi/preset-typescript-rest',
        });
        const afterSecond = await listCacheFiles(dir);
        expect(afterSecond).toHaveLength(2);
    });

    it('writes a new entry when compilerOptions change', { timeout: ENDPOINT_TEST_TIMEOUT_MS }, async () => {
        await generateMetadata({
            entryPoint: decoratorEntry,
            cache: { enabled: true, directoryPath: dir },
            preset: '@trapi/preset-decorators-express',
            tsconfig: { compilerOptions: { strict: true } },
        });
        expect(await listCacheFiles(dir)).toHaveLength(1);

        await generateMetadata({
            entryPoint: decoratorEntry,
            cache: { enabled: true, directoryPath: dir },
            preset: '@trapi/preset-decorators-express',
            tsconfig: { compilerOptions: { strict: false } },
        });
        expect(await listCacheFiles(dir)).toHaveLength(2);
    });

    it('writes a new entry when the resolved registry shape changes (registry-hash wiring)', async () => {
        // Construct MetadataGenerator directly with no preset and an
        // ignore-everything pattern so the source-files hash and node walk
        // are deterministic and empty. This isolates the registry hash as
        // the only varying contributor between the two runs.
        const baseOptions: MetadataGeneratorOptions = {
            entryPoint: [],
            cache: { enabled: true, directoryPath: dir },
            ignore: ['**/*'],
        };

        const genA = new MetadataGenerator({
            sourceFiles: [],
            options: baseOptions,
        });
        // Mutate the resolved registry so its hash differs from a default one.
        genA.registry.controllers.push({
            match: { name: 'CtrlA', on: 'class' },
            apply: () => undefined,
        });
        await genA.generate();
        expect(await listCacheFiles(dir)).toHaveLength(1);

        const genB = new MetadataGenerator({
            sourceFiles: [],
            options: baseOptions,
        });
        // Different match name → different registry hash → different key.
        genB.registry.controllers.push({
            match: { name: 'CtrlB', on: 'class' },
            apply: () => undefined,
        });
        await genB.generate();
        expect(await listCacheFiles(dir)).toHaveLength(2);

        // Sanity: a third run that matches the first registry exactly should
        // hit the cache and not produce a third file.
        const genC = new MetadataGenerator({
            sourceFiles: [],
            options: baseOptions,
        });
        genC.registry.controllers.push({
            match: { name: 'CtrlA', on: 'class' },
            apply: () => undefined,
        });
        await genC.generate();
        expect(await listCacheFiles(dir)).toHaveLength(2);
    });
});
