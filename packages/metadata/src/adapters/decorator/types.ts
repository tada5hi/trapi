/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Example, Response, Security } from '../../core/generator/types';
import type { Extension } from '../../core/resolver/extension';
import type { BaseType, Type } from '../../core/resolver/types';
import type { MethodType } from '../../core/method/types';
import type { Validator } from '../../core/validator/types';
import type {
    CollectionKind,
    DecoratorArgumentKindName,
    DecoratorTargetKind,
    MarkerName,
    NumericKind,
    ParamKind,
} from './constants';

// -----------------------------------------------------------------------------
// Source (Layer 1)
// -----------------------------------------------------------------------------

export type DecoratorTarget = `${DecoratorTargetKind}`;

export type DecoratorArgumentKind = `${DecoratorArgumentKindName}`;

export type DecoratorArgument = {
    raw: unknown;
    kind: DecoratorArgumentKind;
};

export type DecoratorTypeArgument = {
    resolve: () => Type;
};

export type DecoratorHost = {
    name: string;
    parentName?: string;
};

export type DecoratorSource = {
    name: string;
    arguments: DecoratorArgument[];
    typeArguments: DecoratorTypeArgument[];
    target: DecoratorTarget;
    host: DecoratorHost;
    /**
     * Source-file location of the decorator AST node itself (1-based line).
     * Optional because decorator sources can be synthesised in tests without
     * a real source file. Populated by {@link buildDecoratorSources} when the
     * decorator's containing source file is available.
     */
    location?: {
        file: string;
        line: number;
    };
};

export type JsDocSource = {
    tag: string;
    text?: string;
    typeExpression?: {
        resolve: () => Type;
    };
    parameterName?: string;
    target: DecoratorTarget;
    host: DecoratorHost;
};

// -----------------------------------------------------------------------------
// Draft (Layer 2)
// -----------------------------------------------------------------------------

export type ControllerDraft = {
    name: string;
    location: string;
    path?: string;
    hidden: boolean;
    consumes: string[];
    produces: string[];
    tags: string[];
    responses: Response[];
    security: Security[];
    extensions: Extension[];
};

export type MethodDraft = {
    name: string;
    verb?: MethodType;
    path: string;
    operationId?: string;
    description: string;
    summary?: string;
    deprecated?: boolean;
    hidden: boolean;
    consumes: string[];
    produces: string[];
    tags: string[];
    responses: Response[];
    security: Security[];
    extensions: Extension[];
    parameters: ParameterDraft[];
    type?: BaseType;
    /**
     * Examples that handlers (e.g. `@Example`) want attached to the implicitly
     * generated default response. The orchestrator merges these into the
     * default 200/204 response when finalising the method.
     */
    defaultResponseExamples: Example[];
};

export type ParameterDraft = {
    parameterName: string;
    name: string;
    in?: `${ParamKind}`;
    description: string;
    required: boolean;
    type?: Type;
    collectionFormat?: `${CollectionKind}`;
    allowEmptyValue?: boolean;
    default?: unknown;
    maxItems?: number;
    minItems?: number;
    deprecated?: boolean;
    examples: Example[];
    exampleLabels: string[];
    extensions: Extension[];
    validators: Record<string, Validator>;
};

// -----------------------------------------------------------------------------
// Context (Layer 3)
// -----------------------------------------------------------------------------

export type HandlerContext = {
    host: DecoratorHost;
    argument: (index: number) => DecoratorArgument | undefined;
    arguments: () => DecoratorArgument[];
    typeArgument: (index: number) => DecoratorTypeArgument | undefined;
    typeArguments: () => DecoratorTypeArgument[];
    parameterType: () => Type | undefined;
};

export type JsDocHandlerContext = {
    host: DecoratorHost;
    source: JsDocSource;
    parameterType: () => Type | undefined;
};

// -----------------------------------------------------------------------------
// Handler (Layer 3)
// -----------------------------------------------------------------------------

export type Match = {
    name: string;
    on?: DecoratorTarget;
};

export type JsDocMatch = {
    tag: string;
    on?: DecoratorTarget;
};

export type ReplacesPolicy = true | string;

/**
 * Tags a handler with a semantic concept that the type resolver consults.
 *
 * Allows preset authors to rename a decorator (via `match.name`) without
 * breaking type-resolver behaviour: the resolver looks up handlers by marker
 * and reads the canonical decorator name from each handler's `match.name`.
 */
export type ResolverMarker = `${MarkerName}` | { numeric: `${NumericKind}` };

type HandlerBase = {
    match: Match;
    replaces?: ReplacesPolicy;
    marker?: ResolverMarker;
};

export type ControllerHandler = HandlerBase & {
    apply: (ctx: HandlerContext, draft: ControllerDraft) => void;
};

export type MethodHandler = HandlerBase & {
    apply: (ctx: HandlerContext, draft: MethodDraft) => void;
};

export type ParameterHandler = HandlerBase & {
    apply: (ctx: HandlerContext, draft: ParameterDraft) => void;
};

type JsDocHandlerBase = {
    match: JsDocMatch;
    replaces?: ReplacesPolicy;
    marker?: ResolverMarker;
};

export type ControllerJsDocHandler = JsDocHandlerBase & {
    apply: (ctx: JsDocHandlerContext, draft: ControllerDraft) => void;
};

export type MethodJsDocHandler = JsDocHandlerBase & {
    apply: (ctx: JsDocHandlerContext, draft: MethodDraft) => void;
};

export type ParameterJsDocHandler = JsDocHandlerBase & {
    apply: (ctx: JsDocHandlerContext, draft: ParameterDraft) => void;
};

export type AnyDecoratorHandler = ControllerHandler | MethodHandler | ParameterHandler;

export type AnyJsDocHandler = ControllerJsDocHandler | MethodJsDocHandler | ParameterJsDocHandler;

// -----------------------------------------------------------------------------
// Preset & Registry (Layer 6)
// -----------------------------------------------------------------------------

export type Preset = {
    name: string;
    extends?: string[];
    controllers?: ControllerHandler[];
    methods?: MethodHandler[];
    parameters?: ParameterHandler[];
    controllerJsDoc?: ControllerJsDocHandler[];
    methodJsDoc?: MethodJsDocHandler[];
    parameterJsDoc?: ParameterJsDocHandler[];
};

export type Registry = {
    controllers: ControllerHandler[];
    methods: MethodHandler[];
    parameters: ParameterHandler[];
    controllerJsDoc: ControllerJsDocHandler[];
    methodJsDoc: MethodJsDocHandler[];
    parameterJsDoc: ParameterJsDocHandler[];
};

// -----------------------------------------------------------------------------
// Loader options
// -----------------------------------------------------------------------------

export type PresetResolver = (name: string) => Promise<Preset> | Preset;

export type LoadRegistryOptions = {
    resolver: PresetResolver;
    strict?: boolean;
};
