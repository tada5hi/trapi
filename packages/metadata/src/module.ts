/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from 'typescript';
import type { MetadataGenerateOptions, Options } from './config';
import type { Metadata } from './generator';
import { MetadataGenerator } from './generator';
import { scanSourceFiles, softLoadTsconfig } from './utils';
import type { TsConfig } from './utils';

export async function generateMetadata(
    options: MetadataGenerateOptions,
): Promise<Metadata>;
/** @deprecated Use `generateMetadata({ ...options, tsconfig })` instead. */
export async function generateMetadata(
    input: Options | string | string[],
    tsconfig?: string | TsConfig,
): Promise<Metadata>;
export async function generateMetadata(
    input: MetadataGenerateOptions | Options | string | string[],
    tsconfig?: string | TsConfig,
) : Promise<Metadata> {
    let resolvedTsconfig : string | TsConfig | undefined = tsconfig;
    let compilerOptions : CompilerOptions | undefined;

    let options : Options;
    if (typeof input === 'string' || Array.isArray(input)) {
        options = { entryPoint: input };
    } else {
        options = input;
        if (!resolvedTsconfig && 'tsconfig' in input) {
            resolvedTsconfig = (input as MetadataGenerateOptions).tsconfig;
        }
    }

    if (resolvedTsconfig) {
        if (typeof resolvedTsconfig === 'string') {
            resolvedTsconfig = await softLoadTsconfig({ name: resolvedTsconfig });
            compilerOptions = resolvedTsconfig.compilerOptions;
        } else {
            compilerOptions = resolvedTsconfig.compilerOptions || {};
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
