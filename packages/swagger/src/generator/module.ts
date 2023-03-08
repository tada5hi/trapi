/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from '@trapi/metadata';
import { generateMetadata, isMetadata } from '@trapi/metadata';
import type { OptionsInput } from '../config';
import { Version } from '../constants';
import type { SpecV2, SpecV3 } from '../schema';
import { V2Generator } from './v2';
import { V3Generator } from './v3';

export async function buildMetadata(options: OptionsInput, tsConfig?: CompilerOptions) {
    if (isMetadata(options.metadata)) {
        return options.metadata;
    }

    return generateMetadata(options.metadata, tsConfig);
}

export type DocumentationGenerationContext<V extends `${Version}`> = {
    version: V,
    options: OptionsInput,
    tsConfig?: CompilerOptions
};

type OutputSpec<V extends `${Version}`> = V extends `${Version.V2}` ?
    SpecV2 :
    SpecV3;

export async function generate<V extends `${Version}`>(
    context: DocumentationGenerationContext<V>,
): Promise<OutputSpec<V>> {
    const metadata = await buildMetadata(context.options);

    switch (context.version) {
        case Version.V3: {
            const generator = new V3Generator(metadata, context.options);

            return await generator.build() as OutputSpec<V>;
        }
        default: {
            const generator = new V2Generator(metadata, context.options);

            return await generator.build() as OutputSpec<V>;
        }
    }
}
