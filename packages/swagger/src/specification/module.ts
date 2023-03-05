/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Metadata } from '@trapi/metadata';
import { MetadataGenerator } from '@trapi/metadata';
import type { AbstractSpecGenerator } from './abstract';
import { Specification } from './type';
import { Version2SpecGenerator } from './v2';
import { Version3SpecGenerator } from './v3';

export async function createSpecificationGenerator(
    metadata: Metadata | MetadataGenerator,
    config: Specification.Config = {},
) : Promise<AbstractSpecGenerator<any, any>> {
    let data: Metadata;
    if (metadata instanceof MetadataGenerator) {
        data = await metadata.generate();
    } else {
        data = metadata;
    }

    const outputFormat = config.specification || Specification.SpecificationOption.V2;

    let specGenerator: AbstractSpecGenerator<any, any>;

    switch (outputFormat) {
        case Specification.SpecificationOption.V2:
            specGenerator = new Version2SpecGenerator(data, config);
            break;
        case Specification.SpecificationOption.V3:
            specGenerator = new Version3SpecGenerator(data, config);
            break;
    }

    return specGenerator;
}
