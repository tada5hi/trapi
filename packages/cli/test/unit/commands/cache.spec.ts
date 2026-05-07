/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { 
    afterEach, 
    beforeEach, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import { CACHE_FILE_PREFIX, CACHE_FILE_SUFFIX } from '@trapi/metadata';
import { cleanCache } from '../../../src/commands/cache.ts';

describe('cleanCache', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trapi-cli-cache-'));
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    const cacheFile = (name: string) => path.join(dir, `${CACHE_FILE_PREFIX}${name}${CACHE_FILE_SUFFIX}`);

    it('returns 0 removed for a missing directory', async () => {
        const result = await cleanCache({ directory: path.join(dir, 'missing') });
        expect(result).toEqual({ removed: 0, skipped: 0 });
    });

    it('removes all cache files when no max-age is set', async () => {
        await fs.writeFile(cacheFile('aaa'), '{}');
        await fs.writeFile(cacheFile('bbb'), '{}');
        await fs.writeFile(path.join(dir, 'unrelated.json'), '{}');

        const result = await cleanCache({ directory: dir });
        expect(result).toEqual({ removed: 2, skipped: 0 });

        const remaining = await fs.readdir(dir);
        expect(remaining).toEqual(['unrelated.json']);
    });

    it('skips files newer than the max-age cutoff', async () => {
        const fresh = cacheFile('fresh');
        const stale = cacheFile('stale');
        await fs.writeFile(fresh, '{}');
        await fs.writeFile(stale, '{}');

        // Make `stale` look 2 days old.
        const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        await fs.utimes(stale, old, old);

        const result = await cleanCache({ directory: dir, maxAgeMs: 24 * 60 * 60 * 1000 });
        expect(result).toEqual({ removed: 1, skipped: 1 });

        const remaining = await fs.readdir(dir);
        expect(remaining).toEqual([path.basename(fresh)]);
    });

    it('ignores files that do not match the cache prefix/suffix', async () => {
        await fs.writeFile(path.join(dir, '.trapi-metadata-foo.txt'), 'wrong suffix');
        await fs.writeFile(path.join(dir, 'unrelated-prefix-bar.json'), 'wrong prefix');

        const result = await cleanCache({ directory: dir });
        expect(result).toEqual({ removed: 0, skipped: 0 });
        expect(await fs.readdir(dir)).toHaveLength(2);
    });
});
