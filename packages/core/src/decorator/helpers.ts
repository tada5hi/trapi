/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ControllerDraft,
    DecoratorArgument,
    HandlerContext,
    MethodDraft,
} from './types';
import { CoreError } from '../error/base';
import { CoreErrorCode } from '../error/codes';

/**
 * Read a positional argument as a string. Accepts both literal string args
 * (`@Foo('value')`) and identifier references that resolve to a string
 * (`@Foo(SOME_CONSTANT)`). Returns `undefined` for any other argument shape.
 */
export function readString(arg: DecoratorArgument | undefined): string | undefined {
    if (!arg) {
        return undefined;
    }

    if (arg.kind === 'literal' && typeof arg.raw === 'string') {
        return arg.raw;
    }

    if (arg.kind === 'identifier' && typeof arg.raw === 'string') {
        return arg.raw;
    }

    return undefined;
}

/**
 * Read a positional argument as a number. Accepts both numeric literals
 * (`@Foo(201)`) and identifier references that resolve to a number
 * (`@Foo(HttpStatus.CREATED)`, a `const`, an enum or `as const` member).
 * Returns `undefined` for any other argument shape.
 */
export function readNumber(arg: DecoratorArgument | undefined): number | undefined {
    if (!arg) {
        return undefined;
    }

    if (arg.kind === 'literal' && typeof arg.raw === 'number') {
        return arg.raw;
    }

    if (arg.kind === 'identifier' && typeof arg.raw === 'number') {
        return arg.raw;
    }

    return undefined;
}

/**
 * Read a positional argument as a boolean. Only matches boolean literals.
 */
export function readBoolean(arg: DecoratorArgument | undefined): boolean | undefined {
    if (!arg) {
        return undefined;
    }

    if (arg.kind === 'literal' && typeof arg.raw === 'boolean') {
        return arg.raw;
    }

    return undefined;
}

/**
 * Read positional argument `index` through `read`, failing loudly instead of
 * falling back: returns `undefined` only when the argument is absent, and
 * throws a `DECORATOR_ARGUMENT_INVALID` {@link CoreError} when it is present
 * but `read` cannot make sense of it (e.g. an unresolvable constant).
 * `expected` completes the message "must be …", e.g. `'a number'`.
 */
export function requireArgument<T>(
    ctx: HandlerContext,
    index: number,
    read: (arg: DecoratorArgument) => T | undefined,
    expected: string,
): T | undefined {
    const arg = ctx.argument(index);

    if (arg === undefined) {
        return undefined;
    }

    const value = read(arg);

    if (value !== undefined) {
        return value;
    }

    const host = ctx.host.parentName ?
        `${ctx.host.parentName}.${ctx.host.name}` :
        ctx.host.name;

    // `decorator` is required on the type, but a hand-built context literal
    // may lack it; the error must still be the CoreError, not a TypeError.
    const { decorator } = ctx as Partial<Pick<HandlerContext, 'decorator'>>;

    let message = `Argument ${index} of '@${decorator?.name ?? '<unknown>'}' on '${host}' must be ${expected}, ` +
        'but could not be resolved to one.';

    if (decorator?.location) {
        message += ` (${decorator.location.file}:${decorator.location.line})`;
    }

    throw new CoreError({
        message,
        code: CoreErrorCode.DECORATOR_ARGUMENT_INVALID,
    });
}

/**
 * Strict {@link readNumber}: `undefined` when absent, throws when present but
 * not a number.
 */
export function requireNumber(ctx: HandlerContext, index: number): number | undefined {
    return requireArgument(ctx, index, readNumber, 'a number');
}

/**
 * Strict {@link readString}: `undefined` when absent, throws when present but
 * not a string.
 */
export function requireString(ctx: HandlerContext, index: number): string | undefined {
    return requireArgument(ctx, index, readString, 'a string');
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
        const matchesRaw = arg.raw.every((item) => typeof item === 'string');

        if (matchesRaw) {
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
