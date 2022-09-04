/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CompilerOptions } from 'typescript';
import { Config, GeneratorOutput } from './type';
import { createMetadataGenerator } from './generator';

export function generateMetadata(
    config: Config,
    compilerOptions?: CompilerOptions,
) : GeneratorOutput {
    const generator = createMetadataGenerator(config, compilerOptions);

    return generator.generate();
}
