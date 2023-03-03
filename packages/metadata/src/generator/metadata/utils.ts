/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from 'typescript';
import type { Options } from '../../config';
import { MetadataGenerator } from './index';
import { getCompilerOptions } from '../../utils';

export function createMetadataGenerator(
    config: Options,
    compilerOptions?: CompilerOptions,
): MetadataGenerator {
    compilerOptions = compilerOptions ??
        getCompilerOptions() ??
        {};

    return new MetadataGenerator(config, compilerOptions);
}
