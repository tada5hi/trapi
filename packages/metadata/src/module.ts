/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from 'typescript';
import type { Options } from './config';
import type { Metadata } from './generator';
import { createMetadataGenerator } from './generator';

export async function generateMetadata(
    config: Options,
    compilerOptions?: CompilerOptions,
) : Promise<Metadata> {
    const generator = createMetadataGenerator(config, compilerOptions);

    return generator.generate();
}
