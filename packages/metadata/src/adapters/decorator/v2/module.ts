/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
import { createRegistry } from './utils';
import { validatePreset } from './validation';

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
    const validated = await validatePreset(preset);

    if (visited.has(validated.name)) {
        throw new Error(
            `Preset cycle detected: ${[...visited, validated.name].join(' -> ')}`,
        );
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
        throw new Error(
            `Preset '${presetName}': handler with replaces=${describeReplaces(handler.replaces!)} on '${handler.match.name}' did not match any parent handler`,
        );
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
        throw new Error(
            `Preset '${presetName}': JSDoc handler with replaces=${describeReplaces(handler.replaces!)} on '@${handler.match.tag}' did not match any parent handler`,
        );
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
