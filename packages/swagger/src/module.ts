/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions, Config as MetadataConfig } from '@trapi/metadata';
import { createMetadataGenerator } from '@trapi/metadata';
import type { Specification } from './specification';
import { createSpecificationGenerator } from './specification';
import type { SwaggerDocFormatData, SwaggerDocFormatType } from './type';

export async function generateDocumentation(
    config: {
        metadata: MetadataConfig,
        swagger: Specification.Config
    },
    tsConfig?: CompilerOptions,
): Promise<Record<SwaggerDocFormatType, SwaggerDocFormatData>> {
    const metadataGenerator = createMetadataGenerator(config.metadata, tsConfig);

    const metadata = metadataGenerator.generate();

    const specGenerator = createSpecificationGenerator(metadata, config.swagger);

    specGenerator.build();
    return specGenerator.save();
}
