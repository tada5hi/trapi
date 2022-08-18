/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { getCompilerOptions } from '../../../src';

describe('src/typescript.ts', () => {
    it('should get compiler options', () => {
        // with no filename specified
        let compilerOptions = getCompilerOptions({ cwd: './test/data/' });
        expect(compilerOptions).toBeDefined();
        expect(compilerOptions.allowJs).toBeTruthy();

        // with absolute path
        compilerOptions = getCompilerOptions({ cwd: path.join(process.cwd(), 'test/data') });
        expect(compilerOptions).toBeDefined();
        expect(compilerOptions.allowJs).toBeTruthy();

        // with non-existing fileName or filePath
        expect(() => getCompilerOptions({ cwd: './test/data', fileName: 'non-existing-tsconfig.json' })).toThrow();
    });
});
