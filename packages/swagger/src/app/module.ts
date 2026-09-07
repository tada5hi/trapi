/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isMetadata } from '@trapi/core';
import type { SpecGeneratorOptionsInput, SwaggerGenerateOptions } from '../core/config';
import { Version } from '../core/constants';
import { SwaggerError } from '../core/error/module';
import { SwaggerErrorCode } from '../core/error/codes';
import type { OutputForVersion } from '../core/types';
import { V2Generator, V3Generator  } from '../adapters/index.ts';

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
        operationIdStrategy: data.operationIdStrategy,
        specificationExtra: data.extra,
    };
}

export async function generateSwagger<V extends `${Version}`>(
    options: Omit<SwaggerGenerateOptions, 'version'> & { version: V },
): Promise<OutputForVersion<V>> {
    const { metadata } = options;
    if (!isMetadata(metadata)) {
        throw new SwaggerError({
            message: 'Expected `options.metadata` to be a pre-built Metadata object ({ controllers, referenceTypes }). Run `generateMetadata` from `@trapi/metadata` first, or supply your own Metadata-shaped value.',
            code: SwaggerErrorCode.METADATA_INVALID,
        });
    }
    const specGeneratorOptionsInput = toSpecGeneratorOptionsInput(options);

    switch (options.version) {
        case Version.V3:
        case Version.V3_1:
        case Version.V3_2: {
            const generator = new V3Generator(metadata, specGeneratorOptionsInput, options.version);

            return await generator.build() as OutputForVersion<V>;
        }
        default: {
            const generator = new V2Generator(metadata, specGeneratorOptionsInput);

            return await generator.build() as OutputForVersion<V>;
        }
    }
}
