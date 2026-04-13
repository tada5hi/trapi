/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import YAML from 'yamljs';
import type { SwaggerGenerateOutput } from '../config';
import type { DocumentFormat } from '../constants';
import type { SpecV2, SpecV3 } from '../schema';
import type { DocumentFormatData } from '../types';

export async function saveSwagger(
    spec: SpecV2 | SpecV3,
    output: SwaggerGenerateOutput,
): Promise<Record<`${DocumentFormat}`, DocumentFormatData>> {
    let directory = process.cwd();
    if (output.directory) {
        directory = path.isAbsolute(output.directory) ?
            output.directory :
            path.join(process.cwd(), output.directory);
    }
    const fileName = output.fileName ?? 'swagger';

    await fs.promises.mkdir(directory, { recursive: true });

    const data: DocumentFormatData[] = [
        {
            path: path.join(directory, `${fileName}.json`),
            name: `${fileName}.json`,
            content: JSON.stringify(spec, null, 4),
        },
    ];

    if (output.yaml) {
        data.push({
            path: path.join(directory, `${fileName}.yaml`),
            name: `${fileName}.yaml`,
            content: YAML.stringify(spec, 1000),
        });
    }

    const promises: Promise<void>[] = [];
    for (const datum of data) {
        promises.push(fs.promises.writeFile(datum.path, datum.content, { encoding: 'utf-8' }));
    }

    await Promise.all(promises);

    const result = {} as Record<`${DocumentFormat}`, DocumentFormatData>;
    for (const datum of data) {
        result[datum.name as `${DocumentFormat}`] = datum;
    }

    return result;
}
