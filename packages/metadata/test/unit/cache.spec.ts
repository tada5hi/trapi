/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as fs from 'fs';
import { CacheDriver } from '../../src';
import { getWritableDirPath } from '../../src/config';

describe('src/cache/index.ts', () => {
    it('should save cache', () => {
        const cache = new CacheDriver(getWritableDirPath());

        const cachePath : string = cache.save({
            controllers: [],
            referenceTypes: {},
            sourceFilesSize: 0,
        });

        expect(cachePath).toBeDefined();
        expect(fs.existsSync(cachePath)).toBeTruthy();

        const output = cache.get(0);

        expect(output).toBeDefined();
        expect(output).toHaveProperty('controllers');
        expect(output).toHaveProperty('referenceTypes');
        expect(output).toHaveProperty('sourceFilesSize');
    });

    it('should not save & get cache', () => {
        const cacheNone = new CacheDriver(false);

        const cachePath : string = cacheNone.save({
            controllers: [],
            referenceTypes: {},
            sourceFilesSize: 0,
        });

        expect(cachePath).toBeUndefined();

        const output = cacheNone.get(0);

        expect(output).toBeUndefined();
    });
});
