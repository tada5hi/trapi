/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createRequire } from 'node:module';
import type * as TypeScript from 'typescript';
import { ConfigError } from '../error/config';
import { ConfigErrorCode } from '../error/config-codes';
import { CompilerApiModule } from './constants';

export type CompilerApi = typeof TypeScript;

export type CompilerApiLoader = (id: string) => unknown;

function isCompilerApi(input: unknown): input is CompilerApi {
    return typeof input === 'object' &&
        input !== null &&
        typeof (input as Record<string, unknown>).createProgram === 'function';
}

function readVersion(input: unknown) : string | undefined {
    if (typeof input !== 'object' || input === null) {
        return undefined;
    }

    const { version } = input as Record<string, unknown>;
    return typeof version === 'string' ? version : undefined;
}

/**
 * Pick the first module exposing the classic compiler API.
 *
 * A module that fails to load is skipped, as is one that loads without
 * `createProgram` (typescript@7). When nothing qualifies, the error names the
 * installed `typescript` version and the package that fixes it.
 */
export function resolveCompilerApi(load: CompilerApiLoader) : CompilerApi {
    let typescriptVersion : string | undefined;

    const ids = [CompilerApiModule.TYPESCRIPT, CompilerApiModule.TYPESCRIPT6];
    for (const id of ids) {
        let mod : unknown;
        try {
            mod = load(id);
        } catch {
            continue;
        }

        if (isCompilerApi(mod)) {
            return mod;
        }

        if (id === CompilerApiModule.TYPESCRIPT) {
            typescriptVersion = readVersion(mod);
        }
    }

    const found = typescriptVersion ?
        `'typescript@${typescriptVersion}' does not expose the compiler API` :
        '\'typescript\' could not be loaded';

    throw new ConfigError({
        message: `No TypeScript compiler API available: ${found}. ` +
            `Install TypeScript <= 6, or add '${CompilerApiModule.TYPESCRIPT6}' next to TypeScript 7 ` +
            `(npm i -D ${CompilerApiModule.TYPESCRIPT6}).`,
        code: ConfigErrorCode.COMPILER_API_UNAVAILABLE,
    });
}

let instance : CompilerApi | undefined;

export function loadCompilerApi() : CompilerApi {
    if (typeof instance === 'undefined') {
        instance = resolveCompilerApi(createRequire(import.meta.url));
    }

    return instance;
}

/**
 * The classic compiler API, resolved on first property access, so importing
 * this package never throws — only using the compiler does.
 */
export const ts = new Proxy({} as CompilerApi, { get: (_target, key) => Reflect.get(loadCompilerApi(), key) });
