/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CompilerOptions } from 'typescript';
import { getCompilerOptions } from './typescript';
import { Config, GeneratorOutput } from '../type';
import { MetadataGenerator } from '../generator';

export function createMetadataGenerator(
    config: Config,
    compilerOptions?: CompilerOptions | boolean,
): MetadataGenerator {
    const skipLoad: boolean = (typeof compilerOptions === 'boolean' && !compilerOptions) ||
        (typeof compilerOptions !== 'boolean' && typeof compilerOptions !== 'undefined');

    let tscConfig: CompilerOptions = typeof compilerOptions !== 'boolean' &&
    typeof compilerOptions !== 'undefined' ? compilerOptions : {};

    if (!skipLoad) {
        try {
            tscConfig ??= getCompilerOptions();
        } catch (e) {
            /* istanbul ignore next */
            tscConfig = {};
        }
    }

    return new MetadataGenerator(config, tscConfig);
}

export function generateMetadata(
    config: Config,
    compilerOptions?: CompilerOptions | boolean,
) : GeneratorOutput {
    const generator = createMetadataGenerator(config, compilerOptions);

    return generator.generate();
}
