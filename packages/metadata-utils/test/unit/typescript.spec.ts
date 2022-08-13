/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import { getCompilerOptions } from '../../src';

describe('src/typescript.ts', () => {
    it('should get compiler options', () => {
        // with file name specified
        let compilerOptions = getCompilerOptions('./test/data/tsconfig.json');
        expect(compilerOptions).toBeDefined();
        expect(compilerOptions.allowJs).toBeTruthy();

        // with no filename specified
        compilerOptions = getCompilerOptions('./test/data');
        expect(compilerOptions).toBeDefined();
        expect(compilerOptions.allowJs).toBeTruthy();

        // with absolute path
        compilerOptions = getCompilerOptions(path.join(process.cwd(), 'test/data'));
        expect(compilerOptions).toBeDefined();
        expect(compilerOptions.allowJs).toBeTruthy();

        // with non-existing fileName or filePath
        expect(() => getCompilerOptions('./test/data', 'non-existing-tsconfig.json')).toThrow();
        expect(() => getCompilerOptions('./test/data/non-existing/tsconfig.json')).toThrow();
    });
});
