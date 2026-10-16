/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import type { CompilerOptions } from 'typescript';
import { ts } from '../../../core/compiler';
import type { TsCompilerOptions } from './types';

/**
 * Convert raw tsconfig-style options (`target: 'ES2022'`) to their parsed
 * form, key by key. A value that does not convert — because it already is
 * parsed (`target: 9`) or is internal (`pathsBasePath`) — is kept as given,
 * so parsed, raw and mixed input all work.
 */
export function normalizeCompilerOptions(
    input: TsCompilerOptions = {},
    basePath: string = process.cwd(),
) : CompilerOptions {
    const output : CompilerOptions = {};

    const keys = Object.keys(input);
    for (const key of keys) {
        const value = input[key];
        const { options, errors } = ts.convertCompilerOptionsFromJson({ [key]: value }, basePath);
        output[key] = errors.length === 0 && key in options ?
            options[key] :
            value as CompilerOptions[string];
    }

    return output;
}
