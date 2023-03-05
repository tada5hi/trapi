/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions, Options as MetadataConfig } from '@trapi/metadata';
import { generateMetadata } from '@trapi/metadata';
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
    const metadata = await generateMetadata(config.metadata, tsConfig);

    const specGenerator = await createSpecificationGenerator(metadata, config.swagger);
    specGenerator.build();

    return specGenerator.save();
}
