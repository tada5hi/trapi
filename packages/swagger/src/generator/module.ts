/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Metadata } from '@trapi/metadata';
import { generateMetadata, isMetadata } from '@trapi/metadata';
import type { OptionsInput, SwaggerGenerateOptions } from '../config';
import { Version } from '../constants';
import type { SpecV2, SpecV3 } from '../schema';
import { V2Generator } from './v2';
import { V3Generator } from './v3';

type OutputSpec<V extends `${Version}`> = V extends `${Version.V2}` ?
    SpecV2 :
    SpecV3;

function toOptionsInput(options: SwaggerGenerateOptions): OptionsInput {
    const { data } = options;

    const result: OptionsInput = { output: false };

    result.metadata = options.metadata;

    if (data) {
        result.name = data.name;
        result.version = data.version;
        result.description = data.description;
        result.license = data.license;
        result.servers = data.servers;
        result.securityDefinitions = data.securityDefinitions;
        result.consumes = data.consumes;
        result.produces = data.produces;
        result.collectionFormat = data.collectionFormat;
        result.specificationExtra = data.extra;
    }

    return result;
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
    const optionsInput = toOptionsInput(options);

    switch (options.version) {
        case Version.V3:
        case Version.V3_1:
        case Version.V3_2: {
            const generator = new V3Generator(metadata, optionsInput, options.version);

            return await generator.build() as OutputSpec<V>;
        }
        default: {
            const generator = new V2Generator(metadata, optionsInput);

            return await generator.build() as OutputSpec<V>;
        }
    }
}
