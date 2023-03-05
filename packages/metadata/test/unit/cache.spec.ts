/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import { CacheDriver } from '../../src';

describe('src/cache/index.ts', () => {
    it('should save cache', async () => {
        const cache = new CacheDriver();

        const cachePath : string = await cache.save({
            controllers: [],
            referenceTypes: {},
            sourceFilesSize: 0,
        });

        expect(cachePath).toBeDefined();
        expect(fs.existsSync(cachePath)).toBeTruthy();

        const output = await cache.get(0);

        expect(output).toBeDefined();
        expect(output).toHaveProperty('controllers');
        expect(output).toHaveProperty('referenceTypes');
        expect(output).toHaveProperty('sourceFilesSize');
    });

    it('should not save & get cache', async () => {
        const cacheNone = new CacheDriver(false);

        const cachePath : string = await cacheNone.save({
            controllers: [],
            referenceTypes: {},
            sourceFilesSize: 0,
        });

        expect(cachePath).toBeUndefined();

        const output = await cacheNone.get(0);

        expect(output).toBeUndefined();
    });
});
