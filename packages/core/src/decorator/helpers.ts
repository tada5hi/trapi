/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ControllerDraft,
    DecoratorArgument,
    MethodDraft,
} from './types';

/**
 * Read a positional argument as a string. Accepts both literal string args
 * (`@Foo('value')`) and identifier references that resolve to a string
 * (`@Foo(SOME_CONSTANT)`). Returns `undefined` for any other argument shape.
 */
export function readString(arg: DecoratorArgument | undefined): string | undefined {
    if (!arg) return undefined;
    if (arg.kind === 'literal' && typeof arg.raw === 'string') return arg.raw;
    if (arg.kind === 'identifier' && typeof arg.raw === 'string') return arg.raw;
    return undefined;
}

/**
 * Read a positional argument as a number. Only matches numeric literals.
 */
export function readNumber(arg: DecoratorArgument | undefined): number | undefined {
    if (!arg) return undefined;
    if (arg.kind === 'literal' && typeof arg.raw === 'number') return arg.raw;
    return undefined;
}

/**
 * Read a positional argument as a boolean. Only matches boolean literals.
 */
export function readBoolean(arg: DecoratorArgument | undefined): boolean | undefined {
    if (!arg) return undefined;
    if (arg.kind === 'literal' && typeof arg.raw === 'boolean') return arg.raw;
    return undefined;
}

/**
 * Read a positional argument that may be either a single string or an array
 * of strings. Returns `undefined` when the argument is missing, when any
 * array element is non-string, or otherwise unresolvable. All-or-nothing:
 * never returns a partial array with non-string items silently dropped.
 */
export function readStringOrStringArray(
    arg: DecoratorArgument | undefined,
): string[] | undefined {
    const single = readString(arg);
    if (single !== undefined) {
        return [single];
    }
    if (arg?.kind === 'array' && Array.isArray(arg.raw)) {
        if (arg.raw.every((item) => typeof item === 'string')) {
            return arg.raw;
        }
        return undefined;
    }
    return undefined;
}

/**
 * Convenience for the common controller path assignment. Reads the first
 * argument as a string-or-string-array and writes it to `draft.paths`,
 * defaulting to `['']` when the argument is missing or unresolvable. Use this
 * inside a `controller({ match, apply })` handler to declare a class as a
 * controller.
 */
export function setControllerPaths(
    draft: ControllerDraft,
    arg: DecoratorArgument | undefined,
): void {
    draft.paths = readStringOrStringArray(arg) ?? [''];
}

/**
 * Convenience for the common method path assignment. Reads the first argument
 * as a string and writes it to `draft.path` if present; leaves the field
 * untouched otherwise (the orchestrator initialises it to `''`).
 */
export function setMethodPath(
    draft: MethodDraft,
    arg: DecoratorArgument | undefined,
): void {
    const path = readString(arg);
    if (path !== undefined) {
        draft.path = path;
    }
}
