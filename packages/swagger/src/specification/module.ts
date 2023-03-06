/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Metadata } from '@trapi/metadata';
import type { Options } from '../config';
import { SpecificationVersion } from '../constants';
import type { AbstractSpecGenerator } from './abstract';
import { Version2SpecGenerator } from './v2';
import { Version3SpecGenerator } from './v3';

export async function createSpecificationGenerator(
    metadata: Metadata,
    options: Options = {},
) : Promise<AbstractSpecGenerator<any, any>> {
    const outputFormat = options.specification || SpecificationVersion.V2;

    let specGenerator: AbstractSpecGenerator<any, any>;

    switch (outputFormat) {
        case SpecificationVersion.V2:
            specGenerator = new Version2SpecGenerator(metadata, options);
            break;
        case SpecificationVersion.V3:
            specGenerator = new Version3SpecGenerator(metadata, options);
            break;
    }

    return specGenerator;
}
