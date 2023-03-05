/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
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

    it('should not load tsconfig', async () => {
        // with non-existing fileName or filePath
        const tsConfig = await softLoadTsconfig({ cwd: './test/data', name: 'non-existing-tsconfig.json' });
        expect(tsConfig).toBeDefined();
        expect(tsConfig.compilerOptions).toBeUndefined();
    });
});
