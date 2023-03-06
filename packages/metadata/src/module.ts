/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from 'typescript';
import type { Options } from './config';
import type { Metadata } from './generator';
import { MetadataGenerator } from './generator';
import { scanSourceFiles, softLoadTsconfig } from './utils';
import type { TsConfig } from './utils';

export async function generateMetadata(
    input: Options | string | string[],
    tsconfig?: string | TsConfig,
) : Promise<Metadata> {
    let compilerOptions : CompilerOptions | undefined;

    if (tsconfig) {
        if (typeof tsconfig === 'string') {
            tsconfig = await softLoadTsconfig({ name: tsconfig });
            compilerOptions = tsconfig.compilerOptions;
        } else {
            compilerOptions = tsconfig.compilerOptions || {};
        }
    }

    let options : Options;
    if (typeof input === 'string' || Array.isArray(input)) {
        options = {
            entryPoint: input,
        };
    } else {
        options = input;
    }

    const sourceFiles = await scanSourceFiles(options.entryPoint);

    const generator = new MetadataGenerator({
        sourceFiles,
        compilerOptions,
        options,
    });

    return generator.generate();
}
