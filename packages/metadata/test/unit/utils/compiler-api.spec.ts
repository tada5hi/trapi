/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    CompilerApiModule,
    loadCompilerApi,
    resolveCompilerApi,
    ts,
} from '../../../src/core/compiler';
import { ConfigError } from '../../../src/core/error/config';
import { ConfigErrorCode } from '../../../src/core/error/config-codes';

// whichever classic API this run resolved (typescript or the compat package)
const TypeScript = loadCompilerApi();

// typescript@7's main export carries nothing but its version
const v7Stub = { version: '7.0.2' };

function createLoader(modules: Record<string, unknown>) {
    const requested : string[] = [];
    const load = (id: string) => {
        requested.push(id);
        if (!(id in modules)) {
            throw new Error(`Cannot find module '${id}'`);
        }
        return modules[id];
    };

    return { load, requested };
}

function catchError(fn: () => unknown) : unknown {
    try {
        fn();
    } catch (e) {
        return e;
    }

    throw new Error('Expected an error to be thrown.');
}

describe('core/compiler', () => {
    it('should prefer typescript when it exposes the compiler API', () => {
        const typescript6 = { createProgram: (): void => undefined, version: '6.0.3' };
        const { load, requested } = createLoader({
            [CompilerApiModule.TYPESCRIPT]: TypeScript,
            [CompilerApiModule.TYPESCRIPT6]: typescript6,
        });

        expect(resolveCompilerApi(load)).toBe(TypeScript);
        expect(requested).toEqual([CompilerApiModule.TYPESCRIPT]);
    });

    it('should fall back to @typescript/typescript6 next to typescript@7', () => {
        const { load, requested } = createLoader({
            [CompilerApiModule.TYPESCRIPT]: v7Stub,
            [CompilerApiModule.TYPESCRIPT6]: TypeScript,
        });

        expect(resolveCompilerApi(load)).toBe(TypeScript);
        expect(requested).toEqual([CompilerApiModule.TYPESCRIPT, CompilerApiModule.TYPESCRIPT6]);
    });

    it('should fall back to @typescript/typescript6 without typescript', () => {
        const { load } = createLoader({ [CompilerApiModule.TYPESCRIPT6]: TypeScript });

        expect(resolveCompilerApi(load)).toBe(TypeScript);
    });

    it('should name the typescript version when only typescript@7 is installed', () => {
        const { load } = createLoader({ [CompilerApiModule.TYPESCRIPT]: v7Stub });

        const error = catchError(() => resolveCompilerApi(load));
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as ConfigError).code).toEqual(ConfigErrorCode.COMPILER_API_UNAVAILABLE);
        expect((error as ConfigError).message).toContain('\'typescript@7.0.2\' does not expose the compiler API');
        expect((error as ConfigError).message).toContain('npm i -D @typescript/typescript6');
    });

    it('should report a missing typescript', () => {
        const { load } = createLoader({});

        const error = catchError(() => resolveCompilerApi(load));
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as ConfigError).code).toEqual(ConfigErrorCode.COMPILER_API_UNAVAILABLE);
        expect((error as ConfigError).message).toContain('\'typescript\' could not be loaded');
    });

    it('should resolve the proxy to the installed compiler API', () => {
        expect(ts.createProgram).toBe(TypeScript.createProgram);
        expect(ts.SyntaxKind.Decorator).toEqual(TypeScript.SyntaxKind.Decorator);
    });
});
