/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
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
    ResolverMarker,
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
        defaultResponseExamples: [],
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

/**
 * Build a {@link Registry}, optionally seeded with handler arrays from `input`.
 * Any kind omitted from `input` falls back to an empty array, so callers can
 * pass just the kinds they care about (e.g. `createRegistry({ methods: [...] })`).
 *
 * The provided arrays are copied — mutating the result does not affect `input`.
 */
export function createRegistry(input: Partial<Registry> = {}): Registry {
    return {
        controllers: input.controllers ? [...input.controllers] : [],
        methods: input.methods ? [...input.methods] : [],
        parameters: input.parameters ? [...input.parameters] : [],
        controllerJsDoc: input.controllerJsDoc ? [...input.controllerJsDoc] : [],
        methodJsDoc: input.methodJsDoc ? [...input.methodJsDoc] : [],
        parameterJsDoc: input.parameterJsDoc ? [...input.parameterJsDoc] : [],
    };
}

/**
 * Concatenate two registries kind-by-kind. Earlier handlers run first inside
 * the orchestrator, so callers who want override-by-running-later semantics
 * should pass the dominant registry as `b`.
 */
export function mergeRegistries(a: Registry, b: Registry): Registry {
    return {
        controllers: [...a.controllers, ...b.controllers],
        methods: [...a.methods, ...b.methods],
        parameters: [...a.parameters, ...b.parameters],
        controllerJsDoc: [...a.controllerJsDoc, ...b.controllerJsDoc],
        methodJsDoc: [...a.methodJsDoc, ...b.methodJsDoc],
        parameterJsDoc: [...a.parameterJsDoc, ...b.parameterJsDoc],
    };
}

// -----------------------------------------------------------------------------
// Preset name resolution (used by loadRegistryByName)
// -----------------------------------------------------------------------------

export function generatePresetLookupPaths(input: string) : string[] {
    if (path.isAbsolute(input) || input.startsWith('./') || input.startsWith('../')) {
        return [input];
    }

    if (input.startsWith('module:')) {
        return [input.substring('module:'.length)];
    }

    if (!input.startsWith('@')) {
        return [input, `@trapi/${input}`];
    }

    return [input];
}

// -----------------------------------------------------------------------------
// Resolver marker lookups
// -----------------------------------------------------------------------------

/**
 * Collect the unique decorator names of every handler whose `marker` matches
 * the given predicate. Lets the type resolver discover preset-renamed
 * decorators without hard-coding canonical names.
 */
export function namesForMarker(
    registry: Registry,
    predicate: (marker: ResolverMarker) => boolean,
): Set<string> {
    const names = new Set<string>();
    const all = [
        ...registry.controllers,
        ...registry.methods,
        ...registry.parameters,
    ];
    for (const handler of all) {
        if (handler.marker !== undefined && predicate(handler.marker)) {
            names.add(handler.match.name);
        }
    }
    return names;
}

/**
 * Collect the unique JSDoc tag names of every JSDoc handler whose `marker`
 * matches the given predicate. JSDoc analogue of `namesForMarker`.
 */
export function tagsForMarker(
    registry: Registry,
    predicate: (marker: ResolverMarker) => boolean,
): Set<string> {
    const tags = new Set<string>();
    const all = [
        ...registry.controllerJsDoc,
        ...registry.methodJsDoc,
        ...registry.parameterJsDoc,
    ];
    for (const handler of all) {
        if (handler.marker !== undefined && predicate(handler.marker)) {
            tags.add(handler.match.tag);
        }
    }
    return tags;
}

export function isHiddenMarker(marker: ResolverMarker): boolean {
    return marker === 'hidden';
}

export function isDeprecatedMarker(marker: ResolverMarker): boolean {
    return marker === 'deprecated';
}

export function isExtensionMarker(marker: ResolverMarker): boolean {
    return marker === 'extension';
}

export function numericMarkerKind(
    marker: ResolverMarker,
): 'int' | 'long' | 'float' | 'double' | undefined {
    if (typeof marker === 'object' && marker !== null && 'numeric' in marker) {
        return marker.numeric;
    }
    return undefined;
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
