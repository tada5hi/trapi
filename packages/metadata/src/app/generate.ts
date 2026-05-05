/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from 'typescript';
import type { MetadataGenerateOptions } from '../core/config';
import type { Metadata } from '../core/metadata/types';
import { MetadataGenerator } from './generator/metadata';
import { scanSourceFiles } from '../adapters/filesystem';
import { softLoadTsconfig } from '../adapters/filesystem/tsconfig';

export async function generateMetadata(
    options: MetadataGenerateOptions,
) : Promise<Metadata> {
    let compilerOptions : CompilerOptions | undefined;

    if (options.tsconfig) {
        let { tsconfig } = options;
        if (typeof tsconfig === 'string') {
            tsconfig = await softLoadTsconfig({ name: tsconfig });
            compilerOptions = tsconfig.compilerOptions;
        } else {
            compilerOptions = tsconfig.compilerOptions || {};
        }
    }

    const sourceFiles = await scanSourceFiles(options.entryPoint);

    const generator = new MetadataGenerator({
        sourceFiles,
        compilerOptions,
        options,
    });

    return generator.generate();
}
