/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { loadTSConfig, normalizeCompilerOptions } from '../../../src';
import { ts } from '../../../src/core/compiler';

const {
    ModuleKind, 
    ModuleResolutionKind, 
    ScriptTarget, 
} = ts;

describe('adapters/filesystem/tsconfig/utils', () => {
    it('should convert raw tsconfig options', () => {
        const options = normalizeCompilerOptions({
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            lib: ['ES2022'],
            strict: true,
        });

        expect(options).toEqual({
            target: ScriptTarget.ES2022,
            module: ModuleKind.ESNext,
            moduleResolution: ModuleResolutionKind.Bundler,
            lib: ['lib.es2022.d.ts'],
            strict: true,
        });
    });

    it('should keep parsed options unchanged', () => {
        const parsed = {
            target: ScriptTarget.ES2022,
            module: ModuleKind.ESNext,
            lib: ['lib.es2022.d.ts'],
            experimentalDecorators: true,
        };

        expect(normalizeCompilerOptions(parsed)).toEqual(parsed);
    });

    it('should convert mixed options key by key', () => {
        const options = normalizeCompilerOptions({
            target: ScriptTarget.ES2020,
            module: 'commonjs',
        });

        expect(options).toEqual({
            target: ScriptTarget.ES2020,
            module: ModuleKind.CommonJS,
        });
    });

    it('should resolve raw path options against the base path', () => {
        const base = path.join(process.cwd(), 'test/data');
        const options = normalizeCompilerOptions({ outDir: './dist' }, base);

        expect(options).toEqual({ outDir: path.join(base, 'dist') });
    });

    it('should round-trip a loaded tsconfig', async () => {
        const tsConfig = await loadTSConfig({ cwd: './test/data/tsconfig-extends/child' });

        expect(normalizeCompilerOptions(tsConfig.compilerOptions)).toEqual(tsConfig.compilerOptions);
    });
});
