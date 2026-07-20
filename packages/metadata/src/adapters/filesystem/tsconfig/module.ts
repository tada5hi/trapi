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
import { convertCompilerOptionsFromJson } from 'typescript';
import type { TsConfig, TsconfigLoadContext } from './types';

export async function loadTSConfig(
    context: TsconfigLoadContext = {},
) : Promise<TsConfig> {
    let fileName : string;
    let filePath : string;
    const cwd = context.cwd || process.cwd();

    if (typeof context.name === 'string') {
        if (path.isAbsolute(context.name)) {
            filePath = context.name;
        } else {
            filePath = path.resolve(cwd, context.name);
        }

        fileName = path.basename(filePath);
    } else {
        fileName = 'tsconfig.json';
        filePath = path.join(cwd, fileName);
    }

    // read() returns the raw parsed value for data formats —
    // mutable, so compilerOptions can be reassigned below
    const content = await read(filePath);
    if (!isObject(content)) {
        throw new ConfigError({
            message: `The tsconfig file '${filePath}' is malformed.`,
            code: ConfigErrorCode.TSCONFIG_MALFORMED,
        });
    }

    if (typeof content.compilerOptions !== 'undefined') {
        const { options: compilerOptions } = convertCompilerOptionsFromJson(
            content.compilerOptions,
            cwd,
            fileName,
        );

        content.compilerOptions = compilerOptions;
    }

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
