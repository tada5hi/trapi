/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LocterNotFoundError, readAsModule } from 'locter';
import type {
    AnyDecoratorHandler,
    AnyJsDocHandler,
    ControllerHandler,
    ControllerJsDocHandler,
    LoadRegistryOptions,
    MethodHandler,
    MethodJsDocHandler,
    ParameterHandler,
    ParameterJsDocHandler,
    Preset,
    Registry,
    ReplacesPolicy,
} from './types';
import { createRegistry, generatePresetLookupPaths } from './utils';
import { validatePreset } from './validation';
import { CoreError } from '../error/base';
import { CoreErrorCode } from '../error/codes';

const decoratorKinds = ['controllers', 'methods', 'parameters'] as const;
const jsDocKinds = ['controllerJsDoc', 'methodJsDoc', 'parameterJsDoc'] as const;

type TaggedDecoratorHandler = { origin: string; handler: AnyDecoratorHandler };
type TaggedJsDocHandler = { origin: string; handler: AnyJsDocHandler };

type TaggedRegistry = {
    controllers: { origin: string; handler: ControllerHandler }[];
    methods: { origin: string; handler: MethodHandler }[];
    parameters: { origin: string; handler: ParameterHandler }[];
    controllerJsDoc: { origin: string; handler: ControllerJsDocHandler }[];
    methodJsDoc: { origin: string; handler: MethodJsDocHandler }[];
    parameterJsDoc: { origin: string; handler: ParameterJsDocHandler }[];
};

function emptyTaggedRegistry(): TaggedRegistry {
    return {
        controllers: [],
        methods: [],
        parameters: [],
        controllerJsDoc: [],
        methodJsDoc: [],
        parameterJsDoc: [],
    };
}

export async function loadRegistry(
    preset: Preset,
    options: LoadRegistryOptions,
): Promise<Registry> {
    const tagged = await loadTaggedRegistry(preset, options, new Set());
    return stripOrigins(tagged);
}

async function loadTaggedRegistry(
    preset: Preset,
    options: LoadRegistryOptions,
    visited: ReadonlySet<string>,
): Promise<TaggedRegistry> {
    let validated: Preset;
    try {
        validated = await validatePreset(preset);
    } catch (e) {
        if (e instanceof CoreError) {
            throw e;
        }
        throw new CoreError({
            message: e instanceof Error ? e.message : 'Preset validation failed',
            code: CoreErrorCode.PRESET_INVALID,
            cause: e,
        });
    }

    if (visited.has(validated.name)) {
        throw new CoreError({
            message: `Preset cycle detected: ${[...visited, validated.name].join(' -> ')}`,
            code: CoreErrorCode.PRESET_CYCLE,
        });
    }
    const nextVisited = new Set(visited);
    nextVisited.add(validated.name);

    const merged = emptyTaggedRegistry();

    for (const extendsName of validated.extends ?? []) {
        const parentPreset = await options.resolver(extendsName);
        const parentRegistry = await loadTaggedRegistry(parentPreset, options, nextVisited);
        appendTagged(merged, parentRegistry);
    }

    applyOwnHandlers(merged, validated, !!options.strict);

    return merged;
}

function applyOwnHandlers(
    merged: TaggedRegistry,
    preset: Preset,
    strict: boolean,
): void {
    for (const kind of decoratorKinds) {
        const handlers = (preset[kind] ?? []) as AnyDecoratorHandler[];
        for (const handler of handlers) {
            if (handler.replaces) {
                applyReplacesDecorator(merged, kind, handler, preset.name, strict);
            }
            (merged[kind] as TaggedDecoratorHandler[]).push({ origin: preset.name, handler });
        }
    }

    for (const kind of jsDocKinds) {
        const handlers = (preset[kind] ?? []) as AnyJsDocHandler[];
        for (const handler of handlers) {
            if (handler.replaces) {
                applyReplacesJsDoc(merged, kind, handler, preset.name, strict);
            }
            (merged[kind] as TaggedJsDocHandler[]).push({ origin: preset.name, handler });
        }
    }
}

function applyReplacesDecorator(
    merged: TaggedRegistry,
    kind: typeof decoratorKinds[number],
    handler: AnyDecoratorHandler,
    presetName: string,
    strict: boolean,
): void {
    const list = merged[kind] as TaggedDecoratorHandler[];
    const remaining: TaggedDecoratorHandler[] = [];
    let removed = 0;
    for (const entry of list) {
        if (entry.origin !== presetName &&
            handlerMatches(handler, entry.handler.match.name, entry.handler.match.on) &&
            originMatches(handler.replaces!, entry.origin)) {
            removed += 1;
            continue;
        }
        remaining.push(entry);
    }
    if (removed === 0 && strict) {
        throw new CoreError({
            message: `Preset '${presetName}': handler with replaces=${describeReplaces(handler.replaces!)} on '${handler.match.name}' did not match any parent handler`,
            code: CoreErrorCode.PRESET_REPLACES_NO_MATCH,
        });
    }
    (merged as Record<string, unknown>)[kind] = remaining;
}

function applyReplacesJsDoc(
    merged: TaggedRegistry,
    kind: typeof jsDocKinds[number],
    handler: AnyJsDocHandler,
    presetName: string,
    strict: boolean,
): void {
    const list = merged[kind] as TaggedJsDocHandler[];
    const remaining: TaggedJsDocHandler[] = [];
    let removed = 0;
    for (const entry of list) {
        if (entry.origin !== presetName &&
            handlerMatches(handler, entry.handler.match.tag, entry.handler.match.on) &&
            originMatches(handler.replaces!, entry.origin)) {
            removed += 1;
            continue;
        }
        remaining.push(entry);
    }
    if (removed === 0 && strict) {
        throw new CoreError({
            message: `Preset '${presetName}': JSDoc handler with replaces=${describeReplaces(handler.replaces!)} on '@${handler.match.tag}' did not match any parent handler`,
            code: CoreErrorCode.PRESET_REPLACES_NO_MATCH,
        });
    }
    (merged as Record<string, unknown>)[kind] = remaining;
}

function handlerMatches(
    handler: AnyDecoratorHandler | AnyJsDocHandler,
    targetName: string,
    targetOn: string | undefined,
): boolean {
    const matchName = 'name' in handler.match ? handler.match.name : handler.match.tag;
    if (matchName !== targetName) {
        return false;
    }
    if (handler.match.on && handler.match.on !== targetOn) {
        return false;
    }
    return true;
}

function originMatches(replaces: ReplacesPolicy, origin: string): boolean {
    if (replaces === true) {
        return true;
    }
    return replaces === origin;
}

function describeReplaces(replaces: ReplacesPolicy): string {
    return replaces === true ? 'true' : `'${replaces}'`;
}

function appendTagged(target: TaggedRegistry, source: TaggedRegistry): void {
    for (const kind of decoratorKinds) {
        (target[kind] as TaggedDecoratorHandler[]).push(...(source[kind] as TaggedDecoratorHandler[]));
    }
    for (const kind of jsDocKinds) {
        (target[kind] as TaggedJsDocHandler[]).push(...(source[kind] as TaggedJsDocHandler[]));
    }
}

function stripOrigins(tagged: TaggedRegistry): Registry {
    const registry = createRegistry();
    registry.controllers = tagged.controllers.map((e) => e.handler);
    registry.methods = tagged.methods.map((e) => e.handler);
    registry.parameters = tagged.parameters.map((e) => e.handler);
    registry.controllerJsDoc = tagged.controllerJsDoc.map((e) => e.handler);
    registry.methodJsDoc = tagged.methodJsDoc.map((e) => e.handler);
    registry.parameterJsDoc = tagged.parameterJsDoc.map((e) => e.handler);
    return registry;
}

/**
 * Resolve a preset by string identifier (npm package, relative path, etc.) and
 * return the v2 Preset object. Looks for a `preset` named export, then the
 * default export, then the module itself.
 */
export async function resolvePresetByName(input: string): Promise<Preset> {
    const lookupPaths = generatePresetLookupPaths(input);
    let lastError: unknown;

    for (const lookupPath of lookupPaths) {
        try {
            const moduleExport = await readAsModule(lookupPath) as Record<string, unknown>;

            const candidates: unknown[] = [
                (moduleExport as { preset?: unknown }).preset,
                (moduleExport as { default?: unknown }).default,
                moduleExport,
            ];

            for (const candidate of candidates) {
                if (isV2Preset(candidate)) {
                    return candidate;
                }
            }
        } catch (e) {
            if (!isModuleNotFoundError(e)) {
                throw new CoreError({
                    message: e instanceof Error ?
                        `Preset '${input}' failed to load: ${e.message}` :
                        `Preset '${input}' failed to load.`,
                    code: CoreErrorCode.PRESET_INVALID,
                    cause: e,
                });
            }
            lastError = e;
        }
    }

    throw new CoreError({
        message: `Preset '${input}' could not be resolved.`,
        code: CoreErrorCode.PRESET_NOT_FOUND,
        cause: lastError,
    });
}

const MODULE_NOT_FOUND_CODES = new Set([
    'ERR_MODULE_NOT_FOUND',
    'MODULE_NOT_FOUND',
    'ENOENT',
]);

function isModuleNotFoundError(error: unknown): boolean {
    // locter >=3 wraps missing modules in a typed error (cross-realm safe
    // via Symbol.hasInstance markers).
    if (error instanceof LocterNotFoundError) {
        return true;
    }
    // Fallback for errors raised outside locter's readAsModule() (e.g. custom
    // resolvers re-throwing Node module errors).
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const { code } = (error as { code?: unknown });
    return typeof code === 'string' && MODULE_NOT_FOUND_CODES.has(code);
}

/**
 * Resolve a preset by name and immediately materialize its registry, recursively
 * loading `extends` parents through the same resolver.
 */
export async function loadRegistryByName(input: string): Promise<Registry> {
    const preset = await resolvePresetByName(input);
    return loadRegistry(preset, { resolver: resolvePresetByName });
}

function isV2Preset(input: unknown): input is Preset {
    return (
        typeof input === 'object' &&
        input !== null &&
        typeof (input as { name?: unknown }).name === 'string' &&
        !('items' in input)
    );
}
