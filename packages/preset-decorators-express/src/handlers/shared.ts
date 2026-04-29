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
    ParameterDraft,
} from '@trapi/metadata';
import { append } from '@trapi/metadata';

export function readString(arg: DecoratorArgument | undefined): string | undefined {
    if (!arg) return undefined;
    if (arg.kind === 'literal' && typeof arg.raw === 'string') return arg.raw;
    if (arg.kind === 'identifier' && typeof arg.raw === 'string') return arg.raw;
    return undefined;
}

export function readNumber(arg: DecoratorArgument | undefined): number | undefined {
    if (!arg) return undefined;
    if (arg.kind === 'literal' && typeof arg.raw === 'number') return arg.raw;
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

export const setHidden = (_ctx: HandlerContext, draft: { hidden: boolean }) => {
    draft.hidden = true;
};

export const setDeprecated = (_ctx: HandlerContext, draft: { deprecated?: boolean }) => {
    draft.deprecated = true;
};

export const appendTags = append('tags').positionalAll();
export const appendProduces = append('produces').positionalAll();
export const appendConsumes = append('consumes').positionalAll();

export function applyDescriptionToDraft(
    ctx: HandlerContext,
    draft: ControllerDraft | MethodDraft,
): void {
    const statusArg = ctx.argument(0);
    const status = readString(statusArg) ?? String(readNumber(statusArg) ?? '200');
    const description = readString(ctx.argument(1)) ?? 'Response';
    const payload = ctx.argument(2);
    const examples = payload && payload.kind !== 'unresolvable' ?
        [{ value: payload.raw }] :
        [];
    const typeArg = ctx.typeArgument(0);
    draft.responses.push({
        name: status,
        status,
        description,
        examples,
        schema: typeArg ? typeArg.resolve() : undefined,
    });
}

export function appendSecurityToDraft(
    ctx: HandlerContext,
    draft: ControllerDraft | MethodDraft,
): void {
    const scopesArg = ctx.argument(0);
    const nameArg = ctx.argument(1);

    let name = readString(nameArg);
    if (!name) {
        const obj = scopesArg?.kind === 'object' ? scopesArg.raw : undefined;
        if (obj && typeof obj === 'object') {
            // @Security({ schemeName: ['scope'] }) form
            const security: Record<string, string[]> = {};
            for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
                if (Array.isArray(val) && val.every((v) => typeof v === 'string')) {
                    security[key] = val;
                }
            }
            if (Object.keys(security).length > 0) {
                draft.security ??= [];
                draft.security.push(security);
            }
            // Object form attempted: don't fall through to array-form handling.
            // If no valid entries were extracted, reject rather than emit a
            // phantom `{ default: [] }` requirement on a scheme name the user
            // never typed.
            return;
        }
        name = 'default';
    }

    const scopes: string[] = [];
    if (scopesArg?.kind === 'array' && Array.isArray(scopesArg.raw)) {
        // Malformed array (e.g. `[null, 'admin']`): keep the security entry
        // so the endpoint stays secured under `name`, but drop ALL scopes
        // rather than emit a partial list — silently under-reporting scopes
        // is the more dangerous failure mode. Returning early would be worse
        // still, since it would leave the endpoint appearing unsecured.
        if (scopesArg.raw.every((item) => typeof item === 'string')) {
            scopes.push(...scopesArg.raw);
        }
    } else if (scopesArg?.kind === 'literal' && typeof scopesArg.raw === 'string') {
        scopes.push(scopesArg.raw);
    }

    draft.security ??= [];
    draft.security.push({ [name]: scopes });
}

export function appendExtensionToDraft(
    ctx: HandlerContext,
    draft: ControllerDraft | MethodDraft | ParameterDraft,
): void {
    const keyArg = ctx.argument(0);
    const valueArg = ctx.argument(1);
    const key = readString(keyArg);
    if (
        !key ||
        !valueArg ||
        valueArg.kind === 'unresolvable' ||
        typeof valueArg.raw === 'undefined'
    ) {
        return;
    }
    draft.extensions.push({ key, value: valueArg.raw as never });
}
