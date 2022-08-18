/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CompilerOptions, Config as MetadataConfig, createMetadataGenerator } from '@trapi/metadata';
import { Specification } from '../specification';
import { SwaggerDocFormatData, SwaggerDocFormatType } from '../type';
import { createSpecGenerator } from './generator';

export async function generateDocumentation(
    config: {
        metadata: MetadataConfig,
        swagger: Specification.Config
    },
    tsConfig?: CompilerOptions | boolean,
): Promise<Record<SwaggerDocFormatType, SwaggerDocFormatData>> {
    const metadataGenerator = createMetadataGenerator(config.metadata, tsConfig);

    const metadata = metadataGenerator.generate();

    const specGenerator = createSpecGenerator(metadata, config.swagger);

    specGenerator.build();
    return specGenerator.save();
}
