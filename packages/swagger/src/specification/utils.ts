/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// todo: implement character in regex matching
import { GeneratorOutput, MetadataGenerator } from '@trapi/metadata';
import { Specification } from './type';
import { AbstractSpecGenerator } from './abstract';
import { Version2SpecGenerator } from './v2';
import { Version3SpecGenerator } from './v3';

export function removeRepeatingCharacter(str: string, character: string) : string {
    return str.replace('/([^:]$)\/+/g', '$1');
}

export function removeFinalCharacter(str: string, character: string) {
    while (str.charAt(str.length - 1) === character && str.length > 0) {
        str = str.slice(0, -1);
    }

    return str;
}

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
