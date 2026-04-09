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

export type TsCompilerOptions = CompilerOptions;

export type TsConfig = {
    compilerOptions?: TsCompilerOptions,
    [key: string]: any
};
