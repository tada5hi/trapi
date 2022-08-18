/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { GeneratorOutput, MetadataGenerator } from '@trapi/metadata';
import { AbstractSpecGenerator } from '../specification/abstract';
import { Specification } from '../specification/type';
import { Version2SpecGenerator } from '../specification/v2';
import { Version3SpecGenerator } from '../specification/v3';

export function createSpecGenerator(
    metadata: GeneratorOutput | MetadataGenerator,
    config: Specification.Config = {},
) {
    const data: GeneratorOutput = metadata instanceof MetadataGenerator ? metadata.generate() : metadata;

    const outputFormat: Specification.SpecificationOption = config.specification || Specification.SpecificationOption.V2;

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
