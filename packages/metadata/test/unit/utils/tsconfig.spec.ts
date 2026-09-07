/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { loadTSConfig, softLoadTsconfig } from '../../../src';

describe('src/typescript.ts', () => {
    it('should load tsconfig', async () => {
        // with no filename specified
        let tsConfig = await loadTSConfig({ cwd: './test/data/' });
        expect(tsConfig.compilerOptions).toBeDefined();
        expect(tsConfig.compilerOptions.allowJs).toBeTruthy();

        // with absolute path
        tsConfig = await loadTSConfig({ cwd: path.join(process.cwd(), 'test/data') });
        expect(tsConfig.compilerOptions).toBeDefined();
        expect(tsConfig.compilerOptions.allowJs).toBeTruthy();
    });

    it('should follow tsconfig extends', async () => {
        const tsConfig = await loadTSConfig({ cwd: './test/data/tsconfig-extends/child' });
        const base = path.join(process.cwd(), 'test/data/tsconfig-extends');

        expect(tsConfig.compilerOptions).toBeDefined();
        expect(tsConfig.compilerOptions.baseUrl).toEqual(base);
        expect(tsConfig.compilerOptions.pathsBasePath).toEqual(base);
        expect(tsConfig.compilerOptions.paths).toEqual({ '@fixture/*': ['fixture/*'] });
        expect(tsConfig.compilerOptions.allowJs).toBeTruthy();
        expect(tsConfig.compilerOptions.experimentalDecorators).toBeTruthy();
    });

    it('should not load tsconfig', async () => {
        // with non-existing fileName or filePath
        const tsConfig = await softLoadTsconfig({ cwd: './test/data', name: 'non-existing-tsconfig.json' });
        expect(tsConfig).toBeDefined();
        expect(tsConfig.compilerOptions).toBeUndefined();
    });
});
