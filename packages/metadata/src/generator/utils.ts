/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from 'typescript';
import type { Config } from '../type';
import { MetadataGenerator } from './module';
import { getCompilerOptions } from '../utils';

export function createMetadataGenerator(
    config: Config,
    compilerOptions?: CompilerOptions,
): MetadataGenerator {
    compilerOptions = compilerOptions ??
        getCompilerOptions() ??
        {};

    return new MetadataGenerator(config, compilerOptions);
}
