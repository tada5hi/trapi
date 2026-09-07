/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'locter';
import { isObject } from 'smob';
import { ConfigErrorCode } from '../../../core/error/config-codes';
import { ConfigError } from '../../../core/error/config';
import process from 'node:process';
import path from 'node:path';
import { parseJsonConfigFileContent, sys } from 'typescript';
import type { TsConfig, TsconfigLoadContext } from './types';

export async function loadTSConfig(
    context: TsconfigLoadContext = {},
) : Promise<TsConfig> {
    const cwd = context.cwd || process.cwd();
    // must be absolute: with a relative basePath, typescript silently skips the extends chain
    const filePath = path.resolve(cwd, context.name || 'tsconfig.json');

    // read() returns the raw parsed value for data formats —
    // mutable, so compilerOptions can be reassigned below
    const content = await read(filePath);
    if (!isObject(content)) {
        throw new ConfigError({
            message: `The tsconfig file '${filePath}' is malformed.`,
            code: ConfigErrorCode.TSCONFIG_MALFORMED,
        });
    }

    // unlike convertCompilerOptionsFromJson, this follows extends and sets pathsBasePath.
    // the copy keeps the returned raw config clean — parseJsonConfigFileContent
    // writes compileOnSave and the inherited include/exclude onto what it is handed.
    content.compilerOptions = parseJsonConfigFileContent(
        { ...content },
        sys,
        path.dirname(filePath),
        undefined,
        filePath,
    ).options;

    return content;
}

export async function softLoadTsconfig(
    context: TsconfigLoadContext = {},
) : Promise<TsConfig> {
    try {
        return await loadTSConfig(context);
    } catch {
        return {};
    }
}
