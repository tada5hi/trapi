/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from '@trapi/metadata';
import { generateMetadata } from '@trapi/metadata';
import type { Options } from './config';
import type { DocumentFormat } from './constants';
import { createSpecificationGenerator } from './specification';
import type { DocumentFormatData } from './type';

export async function generateDocumentation(
    options: Options,
    tsConfig?: CompilerOptions,
): Promise<Record<`${DocumentFormat}`, DocumentFormatData>> {
    const metadata = await generateMetadata(options.metadata, tsConfig);

    const specGenerator = await createSpecificationGenerator(metadata, options);
    specGenerator.build();

    return specGenerator.save();
}
