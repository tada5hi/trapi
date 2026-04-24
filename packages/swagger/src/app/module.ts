/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Metadata } from '@trapi/metadata';
import { generateMetadata, isMetadata } from '@trapi/metadata';
import type { SpecGeneratorOptionsInput, SwaggerGenerateOptions } from '../core/config';
import { Version } from '../core/constants';
import type { SpecV2, SpecV3 } from '../core/schema';
import { V2Generator, V3Generator  } from '../adapters/index.ts';

type OutputSpec<V extends `${Version}`> = V extends `${Version.V2}` ?
    SpecV2 :
    SpecV3;

function toSpecGeneratorOptionsInput(options: SwaggerGenerateOptions): SpecGeneratorOptionsInput {
    const { data } = options;

    if (!data) {
        return {};
    }

    return {
        name: data.name,
        version: data.version,
        description: data.description,
        license: data.license,
        servers: data.servers,
        securityDefinitions: data.securityDefinitions,
        consumes: data.consumes,
        produces: data.produces,
        collectionFormat: data.collectionFormat,
        specificationExtra: data.extra,
    };
}

async function resolveMetadata(options: SwaggerGenerateOptions): Promise<Metadata> {
    if (isMetadata(options.metadata)) {
        return options.metadata;
    }

    return generateMetadata(options.metadata);
}

export async function generateSwagger<V extends `${Version}`>(
    options: Omit<SwaggerGenerateOptions, 'version'> & { version: V },
): Promise<OutputSpec<V>> {
    const metadata = await resolveMetadata(options);
    const specGeneratorOptionsInput = toSpecGeneratorOptionsInput(options);

    switch (options.version) {
        case Version.V3:
        case Version.V3_1:
        case Version.V3_2: {
            const generator = new V3Generator(metadata, specGeneratorOptionsInput, options.version);

            return await generator.build() as OutputSpec<V>;
        }
        default: {
            const generator = new V2Generator(metadata, specGeneratorOptionsInput);

            return await generator.build() as OutputSpec<V>;
        }
    }
}
