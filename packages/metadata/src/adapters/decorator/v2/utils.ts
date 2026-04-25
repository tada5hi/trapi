/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ControllerDraft,
    ControllerHandler,
    ControllerJsDocHandler,
    DecoratorSource,
    HandlerContext,
    JsDocMatch,
    JsDocSource,
    Match,
    MethodDraft,
    MethodHandler,
    MethodJsDocHandler,
    ParameterDraft,
    ParameterHandler,
    ParameterJsDocHandler,
    Registry,
} from './types';

// -----------------------------------------------------------------------------
// Match predicates
// -----------------------------------------------------------------------------

export function matches(match: Match, source: Pick<DecoratorSource, 'name' | 'target'>): boolean {
    if (match.name !== source.name) {
        return false;
    }
    if (match.on && match.on !== source.target) {
        return false;
    }
    return true;
}

export function matchesJsDoc(match: JsDocMatch, source: Pick<JsDocSource, 'tag' | 'target'>): boolean {
    if (match.tag !== source.tag) {
        return false;
    }
    if (match.on && match.on !== source.target) {
        return false;
    }
    return true;
}

// -----------------------------------------------------------------------------
// Draft factories
// -----------------------------------------------------------------------------

export function newControllerDraft(input: Pick<ControllerDraft, 'name' | 'location'>): ControllerDraft {
    return {
        name: input.name,
        location: input.location,
        hidden: false,
        consumes: [],
        produces: [],
        tags: [],
        responses: [],
        security: [],
        extensions: [],
    };
}

export function newMethodDraft(input: Pick<MethodDraft, 'name'>): MethodDraft {
    return {
        name: input.name,
        path: '',
        description: '',
        hidden: false,
        consumes: [],
        produces: [],
        tags: [],
        responses: [],
        security: [],
        extensions: [],
        parameters: [],
    };
}

export function newParameterDraft(input: Pick<ParameterDraft, 'parameterName'>): ParameterDraft {
    return {
        parameterName: input.parameterName,
        name: input.parameterName,
        description: '',
        required: true,
        examples: [],
        exampleLabels: [],
        extensions: [],
        validators: {},
    };
}

// -----------------------------------------------------------------------------
// Registry factory
// -----------------------------------------------------------------------------

export function createRegistry(): Registry {
    return {
        controllers: [],
        methods: [],
        parameters: [],
        controllerJsDoc: [],
        methodJsDoc: [],
        parameterJsDoc: [],
    };
}

// -----------------------------------------------------------------------------
// Handler builder identity functions (preserve narrow types at declaration site)
// -----------------------------------------------------------------------------

export const controller = (handler: ControllerHandler): ControllerHandler => handler;
export const method = (handler: MethodHandler): MethodHandler => handler;
export const parameter = (handler: ParameterHandler): ParameterHandler => handler;
export const controllerJsDoc = (handler: ControllerJsDocHandler): ControllerJsDocHandler => handler;
export const methodJsDoc = (handler: MethodJsDocHandler): MethodJsDocHandler => handler;
export const parameterJsDoc = (handler: ParameterJsDocHandler): ParameterJsDocHandler => handler;

// -----------------------------------------------------------------------------
// Apply helpers (Layer 4)
// -----------------------------------------------------------------------------

type AnyDraft = ControllerDraft | MethodDraft | ParameterDraft;
type DraftApply = (ctx: HandlerContext, draft: AnyDraft) => void;

function isLiteralLike(kind: string): boolean {
    return kind === 'literal' || kind === 'identifier';
}

function readArray(draft: AnyDraft, key: string): unknown[] {
    const record = draft as Record<string, unknown>;
    const existing = record[key];
    if (Array.isArray(existing)) {
        return existing;
    }
    if (typeof existing !== 'undefined') {
        throw new TypeError(
            `append(): cannot append to draft key "${key}": existing value is not an array (got ${typeof existing}).`,
        );
    }
    const created: unknown[] = [];
    record[key] = created;
    return created;
}

// Scalar-only writer. Use for fields that hold a single value (path, name, description, ...).
// Object/array/unresolvable arguments are intentionally ignored — use `append()` for arrays.
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

// Array writer. Use for fields that hold lists (tags, produces, security, ...).
// Array arguments are flattened; scalar arguments are pushed as-is.
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

export function flag(key: string, value: unknown = true): DraftApply {
    return (_ctx, draft) => {
        (draft as Record<string, unknown>)[key] = value;
    };
}
