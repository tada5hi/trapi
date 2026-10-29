/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CompilerOptions } from 'typescript';

export type TsconfigLoadContext = {
    cwd?: string,
    name?: string
};

/**
 * Compiler options in either form: parsed (`target: ScriptTarget.ES2022`, as
 * returned by the compiler API) or raw tsconfig JSON (`target: 'ES2022'`).
 * Raw values are converted before the program is created, so callers never
 * need enum values from a particular `typescript` copy.
 */
export type TsCompilerOptions = CompilerOptions | Record<string, unknown>;

export type TsConfig = {
    compilerOptions?: CompilerOptions,
    [key: string]: any
};

/**
 * A tsconfig handed over inline: like {@link TsConfig}, but compilerOptions
 * may also be raw tsconfig JSON.
 */
export type TsConfigInput = {
    compilerOptions?: TsCompilerOptions,
    [key: string]: any
};
