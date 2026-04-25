/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HandlerContext } from './context';
import type { ControllerDraft, MethodDraft, ParameterDraft } from './draft';
import type {
    ControllerHandler,
    ControllerJsDocHandler,
    MethodHandler,
    MethodJsDocHandler,
    ParameterHandler,
    ParameterJsDocHandler,
} from './handler';

export const controller = (handler: ControllerHandler): ControllerHandler => handler;
export const method = (handler: MethodHandler): MethodHandler => handler;
export const parameter = (handler: ParameterHandler): ParameterHandler => handler;
export const controllerJsDoc = (handler: ControllerJsDocHandler): ControllerJsDocHandler => handler;
export const methodJsDoc = (handler: MethodJsDocHandler): MethodJsDocHandler => handler;
export const parameterJsDoc = (handler: ParameterJsDocHandler): ParameterJsDocHandler => handler;

type AnyDraft = ControllerDraft | MethodDraft | ParameterDraft;
type DraftApply = (ctx: HandlerContext, draft: AnyDraft) => void;

function isLiteralLike(kind: string): boolean {
    return kind === 'literal' || kind === 'identifier';
}

export function into(key: string) {
    return {
        positional(index: number): DraftApply {
            return (ctx, draft) => {
                const arg = ctx.argument(index);
                if (arg && isLiteralLike(arg.kind)) {
                    (draft as Record<string, unknown>)[key] = arg.raw;
                }
            };
        },
        typeArgument(index = 0): DraftApply {
            return (ctx, draft) => {
                const ta = ctx.typeArgument(index);
                if (ta) {
                    (draft as Record<string, unknown>)[key] = ta.resolve();
                }
            };
        },
    };
}

export function append(key: string) {
    return {
        positional(index: number): DraftApply {
            return (ctx, draft) => {
                const arg = ctx.argument(index);
                if (!arg) {
                    return;
                }
                const target = readArray(draft, key);
                if (arg.kind === 'array' && Array.isArray(arg.raw)) {
                    target.push(...arg.raw);
                } else if (isLiteralLike(arg.kind)) {
                    target.push(arg.raw);
                }
            };
        },
        positionalAll(): DraftApply {
            return (ctx, draft) => {
                const target = readArray(draft, key);
                for (const arg of ctx.arguments()) {
                    if (arg.kind === 'array' && Array.isArray(arg.raw)) {
                        target.push(...arg.raw);
                    } else if (isLiteralLike(arg.kind)) {
                        target.push(arg.raw);
                    }
                }
            };
        },
    };
}

function readArray(draft: AnyDraft, key: string): unknown[] {
    const record = draft as Record<string, unknown>;
    const existing = record[key];
    if (Array.isArray(existing)) {
        return existing;
    }
    const created: unknown[] = [];
    record[key] = created;
    return created;
}

export function flag(key: string, value: unknown = true): DraftApply {
    return (_ctx, draft) => {
        (draft as Record<string, unknown>)[key] = value;
    };
}
