/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject, load } from 'locter';
import process from 'node:process';
import path from 'node:path';
import { convertCompilerOptionsFromJson } from 'typescript';
import type { TsConfig, TsconfigLoadContext } from './type';

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

    const content = await load(filePath);
    if (!isObject(content)) {
        throw new Error('The tsconfig file is malformed.');
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
    } catch (e) {
        return {};
    }
}
