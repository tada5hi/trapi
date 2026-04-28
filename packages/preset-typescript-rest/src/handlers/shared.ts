/*
 * Copyright (c) 2021-2026.
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

export function readStringOrStringArray(
    arg: DecoratorArgument | undefined,
): string[] | undefined {
    const single = readString(arg);
    if (single !== undefined) {
        return [single];
    }
    if (arg?.kind === 'array' && Array.isArray(arg.raw)) {
        const out: string[] = [];
        for (const item of arg.raw) {
            if (typeof item === 'string') out.push(item);
        }
        return out;
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
