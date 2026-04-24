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
import type { SwaggerSaveOptions } from '../core/config';
import { DocumentFormat } from '../core/constants';
import type { SpecV2, SpecV3 } from '../core/schema';
import type { DocumentFormatData } from '../core/types';

const EXTENSION_PATTERN = /\.(json|ya?ml)$/i;

function resolveFileName(name: string | undefined, format: `${DocumentFormat}`): string {
    const base = (name ?? 'swagger').replace(EXTENSION_PATTERN, '');
    return `${base}.${format}`;
}

function serialise(spec: SpecV2 | SpecV3, format: `${DocumentFormat}`): string {
    if (format === DocumentFormat.YAML) {
        return YAML.stringify(spec, 1000);
    }
    return JSON.stringify(spec, null, 4);
}

export async function saveSwagger(
    spec: SpecV2 | SpecV3,
    options: SwaggerSaveOptions = {},
): Promise<DocumentFormatData> {
    const format: `${DocumentFormat}` = options.format ?? DocumentFormat.JSON;

    let cwd = process.cwd();
    if (options.cwd) {
        cwd = path.isAbsolute(options.cwd) ? options.cwd : path.join(process.cwd(), options.cwd);
    }

    const name = resolveFileName(options.name, format);
    const filePath = path.join(cwd, name);

    await fs.promises.mkdir(cwd, { recursive: true });

    const content = serialise(spec, format);
    await fs.promises.writeFile(filePath, content, { encoding: 'utf-8' });

    return {
        path: filePath,
        name,
        content,
    };
}
