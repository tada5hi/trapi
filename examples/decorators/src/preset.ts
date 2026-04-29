/*
 * A v2 Preset that recognises the decorator names exported by ./decorators.ts.
 * Inspect ./fixtures/sample.ts to see the controller this preset interprets,
 * and ./test/preset.spec.ts for the assertions on the extracted metadata.
 *
 * The handlers fall into three groups:
 *  - Routing: @Controller, HTTP verbs, parameter binders.
 *  - TRAPI markers: @Hidden, @Tags, @Description, @Example, @Extension,
 *                   @Security, @Produces, @Consumes, @Accept, @Deprecated,
 *                   @IsInt/@IsLong/@IsFloat/@IsDouble.
 *  - JSDoc tags: /** @hidden *\/, /** @deprecated *\/, /** @summary *\/, etc.
 */

import type {
    ControllerDraft,
    ControllerHandler,
    DecoratorArgument,
    HandlerContext,
    MethodDraft,
    MethodHandler,
    ParameterDraft,
    ParameterHandler,
    Preset,
} from '@trapi/metadata';
import {
    MarkerName,
    NumericKind,
    ParamKind,
    append,
    controller,
    controllerJsDoc,
    method,
    methodJsDoc,
    parameter,
    parameterJsDoc,
} from '@trapi/metadata';

// --- Helpers ---------------------------------------------------------------

function readString(arg: DecoratorArgument | undefined): string | undefined {
    if (!arg) return undefined;
    if (arg.kind === 'literal' && typeof arg.raw === 'string') return arg.raw;
    if (arg.kind === 'identifier' && typeof arg.raw === 'string') return arg.raw;
    return undefined;
}

function readNumber(arg: DecoratorArgument | undefined): number | undefined {
    if (!arg) return undefined;
    if (arg.kind === 'literal' && typeof arg.raw === 'number') return arg.raw;
    return undefined;
}

function readStringOrStringArray(arg: DecoratorArgument | undefined): string[] | undefined {
    const single = readString(arg);
    if (single !== undefined) return [single];
    if (arg?.kind === 'array' && Array.isArray(arg.raw)) {
        // All-or-nothing — never silently drop non-string items.
        if (arg.raw.every((item) => typeof item === 'string')) {
            return arg.raw;
        }
        return undefined;
    }
    return undefined;
}

const setHidden = (_ctx: HandlerContext, draft: { hidden: boolean }) => { draft.hidden = true; };
const setDeprecated = (_ctx: HandlerContext, draft: { deprecated?: boolean }) => { draft.deprecated = true; };
const appendTags = append('tags').positionalAll();
const appendProduces = append('produces').positionalAll();
const appendConsumes = append('consumes').positionalAll();

function appendExtensionToDraft(
    ctx: HandlerContext,
    draft: ControllerDraft | MethodDraft | ParameterDraft,
): void {
    const keyArg = ctx.argument(0);
    const valueArg = ctx.argument(1);
    const key = readString(keyArg);
    if (!key || !valueArg || valueArg.kind === 'unresolvable' || typeof valueArg.raw === 'undefined') {
        return;
    }
    draft.extensions.push({ key, value: valueArg.raw as never });
}

function appendSecurityToDraft(
    ctx: HandlerContext,
    draft: ControllerDraft | MethodDraft,
): void {
    const scopesArg = ctx.argument(0);
    const nameArg = ctx.argument(1);
    const name = readString(nameArg) ?? 'default';
    const scopes: string[] = [];
    if (scopesArg?.kind === 'array' && Array.isArray(scopesArg.raw)) {
        // Malformed array: keep the security entry so the endpoint stays
        // secured, but drop ALL scopes rather than emit partial. Returning
        // early would leave the endpoint appearing unsecured.
        if (scopesArg.raw.every((item) => typeof item === 'string')) {
            scopes.push(...scopesArg.raw);
        }
    }
    draft.security ??= [];
    draft.security.push({ [name]: scopes });
}

function applyDescriptionToDraft(
    ctx: HandlerContext,
    draft: ControllerDraft | MethodDraft,
): void {
    const statusArg = ctx.argument(0);
    const status = readString(statusArg) ?? String(readNumber(statusArg) ?? '200');
    const description = readString(ctx.argument(1)) ?? 'Response';
    const payload = ctx.argument(2);
    const examples = payload && payload.kind !== 'unresolvable' ? [{ value: payload.raw }] : [];
    const typeArg = ctx.typeArgument(0);
    draft.responses.push({
        name: status,
        status,
        description,
        examples,
        schema: typeArg ? typeArg.resolve() : undefined,
    });
}

// --- Routing: controller ---------------------------------------------------

const controllerControllerHandler = controller({
    match: { name: 'Controller', on: 'class' },
    apply: (ctx, draft) => {
        draft.paths = readStringOrStringArray(ctx.argument(0)) ?? [''];
    },
});

const controllerMountHandler = controller({
    match: { name: 'Mount', on: 'class' },
    apply: (ctx, draft) => {
        const paths = readStringOrStringArray(ctx.argument(0));
        if (paths !== undefined) draft.paths = paths;
    },
});

// --- Routing: method verbs -------------------------------------------------

function setVerbAndPath(verb: MethodDraft['verb']): MethodHandler['apply'] {
    return (ctx, draft) => {
        draft.verb = verb;
        const path = readString(ctx.argument(0));
        if (path !== undefined) draft.path = path;
    };
}

// `All` maps to `get` for OpenAPI emission (closest analogue).
const methodVerbHandlers: MethodHandler[] = (
    [['Get', 'get'], ['Post', 'post'], ['Put', 'put'], ['Delete', 'delete'], ['Patch', 'patch'], ['Options', 'options'], ['Head', 'head'], ['All', 'get']] as Array<[string, MethodDraft['verb']]>
).map(([name, verb]) => method({
    match: { name, on: 'method' },
    apply: setVerbAndPath(verb),
}));

const methodMountHandler = method({
    match: { name: 'Mount', on: 'method' },
    apply: (ctx, draft) => {
        const path = readString(ctx.argument(0));
        if (path !== undefined) draft.path = path;
    },
});

// --- Routing: parameter binders --------------------------------------------

function namedClaim(kind: typeof ParamKind[keyof typeof ParamKind]): ParameterHandler['apply'] {
    return (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = kind;
        if (name) draft.name = name;
    };
}

function claimParameter(
    kind: typeof ParamKind[keyof typeof ParamKind],
    namedKind: typeof ParamKind[keyof typeof ParamKind],
): ParameterHandler['apply'] {
    return (ctx, draft) => {
        const argName = readString(ctx.argument(0));
        if (argName !== undefined) {
            draft.in = namedKind;
            draft.name = argName;
        } else {
            draft.in = kind;
        }
    };
}

const routingParameterHandlers: ParameterHandler[] = [
    parameter({ match: { name: 'Body', on: 'parameter' }, apply: claimParameter(ParamKind.Body, ParamKind.BodyProp) }),
    parameter({ match: { name: 'Query', on: 'parameter' }, apply: claimParameter(ParamKind.Query, ParamKind.QueryProp) }),
    parameter({ match: { name: 'Path', on: 'parameter' }, apply: namedClaim(ParamKind.Path) }),
    parameter({ match: { name: 'Header', on: 'parameter' }, apply: namedClaim(ParamKind.Header) }),
    parameter({ match: { name: 'Cookie', on: 'parameter' }, apply: namedClaim(ParamKind.Cookie) }),
    parameter({ match: { name: 'Form', on: 'parameter' }, apply: namedClaim(ParamKind.FormData) }),
    parameter({ match: { name: 'File', on: 'parameter' }, apply: namedClaim(ParamKind.FormData) }),
    parameter({ match: { name: 'Param', on: 'parameter' }, apply: namedClaim(ParamKind.Path) }),
];

// --- TRAPI markers: controller + method ------------------------------------
//
// `marker:` registrations let the type resolver discover decorators by concept
// rather than by hardcoded name, so renaming `@Hidden` → `@Skip` keeps working.

const controllerMarkerHandlers: ControllerHandler[] = [
    controller({
        match: { name: 'Hidden', on: 'class' }, 
        apply: setHidden, 
        marker: MarkerName.Hidden, 
    }),
    controller({ match: { name: 'Tags', on: 'class' }, apply: appendTags }),
    controller({ match: { name: 'Produces', on: 'class' }, apply: appendProduces }),
    controller({ match: { name: 'Consumes', on: 'class' }, apply: appendConsumes }),
    controller({ match: { name: 'Accept', on: 'class' }, apply: appendConsumes }),
    controller({ match: { name: 'Security', on: 'class' }, apply: appendSecurityToDraft }),
    controller({
        match: { name: 'Extension', on: 'class' }, 
        apply: appendExtensionToDraft, 
        marker: MarkerName.Extension, 
    }),
    controller({ match: { name: 'Description', on: 'class' }, apply: applyDescriptionToDraft }),
];

const methodMarkerHandlers: MethodHandler[] = [
    method({
        match: { name: 'Hidden', on: 'method' }, 
        apply: setHidden, 
        marker: MarkerName.Hidden, 
    }),
    method({
        match: { name: 'Deprecated', on: 'method' }, 
        apply: setDeprecated, 
        marker: MarkerName.Deprecated, 
    }),
    method({ match: { name: 'Tags', on: 'method' }, apply: appendTags }),
    method({ match: { name: 'Produces', on: 'method' }, apply: appendProduces }),
    method({ match: { name: 'Consumes', on: 'method' }, apply: appendConsumes }),
    method({ match: { name: 'Accept', on: 'method' }, apply: appendConsumes }),
    method({ match: { name: 'Security', on: 'method' }, apply: appendSecurityToDraft }),
    method({
        match: { name: 'Extension', on: 'method' }, 
        apply: appendExtensionToDraft, 
        marker: MarkerName.Extension, 
    }),
    method({ match: { name: 'Description', on: 'method' }, apply: applyDescriptionToDraft }),
    method({
        match: { name: 'Example', on: 'method' },
        apply: (ctx, draft) => {
            const payload = ctx.argument(0);
            if (!payload || payload.kind === 'unresolvable') return;
            const label = readString(ctx.argument(1));
            draft.defaultResponseExamples.push(
                label === undefined ? { value: payload.raw } : { value: payload.raw, label },
            );
        },
    }),
];

// --- TRAPI markers: parameter (numeric narrowing + extension) --------------

function numericValidator(kind: NumericKind, format: string): ParameterHandler['apply'] {
    return (_ctx, draft) => {
        const name = `is${kind[0].toUpperCase()}${kind.slice(1)}`;
        draft.validators[name] = {
            value: kind,
            meta: { openApi: { kind: 'format', format } },
        };
    };
}

const parameterMarkerHandlers: ParameterHandler[] = [
    parameter({
        match: { name: 'Extension', on: 'parameter' }, 
        apply: appendExtensionToDraft, 
        marker: MarkerName.Extension, 
    }),
    parameter({
        match: { name: 'IsInt', on: 'parameter' }, 
        apply: numericValidator('int', 'int32'), 
        marker: { numeric: NumericKind.Int }, 
    }),
    parameter({
        match: { name: 'IsLong', on: 'parameter' }, 
        apply: numericValidator('long', 'int64'), 
        marker: { numeric: NumericKind.Long }, 
    }),
    parameter({
        match: { name: 'IsFloat', on: 'parameter' }, 
        apply: numericValidator('float', 'float'), 
        marker: { numeric: NumericKind.Float }, 
    }),
    parameter({
        match: { name: 'IsDouble', on: 'parameter' }, 
        apply: numericValidator('double', 'double'), 
        marker: { numeric: NumericKind.Double }, 
    }),
];

// --- JSDoc handlers --------------------------------------------------------

const noopJsDoc = () => { /* marker-only handler */ };

const controllerJsDocHandlers = [
    controllerJsDoc({
        match: { tag: 'hidden' },
        apply: (_ctx, draft) => { draft.hidden = true; },
        marker: MarkerName.Hidden,
    }),
];

const methodJsDocHandlers = [
    methodJsDoc({
        match: { tag: 'hidden' },
        apply: (_ctx, draft) => { draft.hidden = true; },
        marker: MarkerName.Hidden,
    }),
    methodJsDoc({
        match: { tag: 'deprecated' },
        apply: (_ctx, draft) => { draft.deprecated = true; },
        marker: MarkerName.Deprecated,
    }),
    methodJsDoc({
        match: { tag: 'summary' },
        apply: (ctx, draft) => { if (ctx.source.text) draft.summary = ctx.source.text; },
    }),
];

const parameterJsDocHandlers = [
    parameterJsDoc({
        match: { tag: 'deprecated' },
        apply: (_ctx, draft) => { draft.deprecated = true; },
        marker: MarkerName.Deprecated,
    }),
    parameterJsDoc({
        match: { tag: 'isInt' }, 
        apply: noopJsDoc, 
        marker: { numeric: NumericKind.Int }, 
    }),
    parameterJsDoc({
        match: { tag: 'isLong' }, 
        apply: noopJsDoc, 
        marker: { numeric: NumericKind.Long }, 
    }),
    parameterJsDoc({
        match: { tag: 'isFloat' }, 
        apply: noopJsDoc, 
        marker: { numeric: NumericKind.Float }, 
    }),
    parameterJsDoc({
        match: { tag: 'isDouble' }, 
        apply: noopJsDoc, 
        marker: { numeric: NumericKind.Double }, 
    }),
];

// --- Preset ----------------------------------------------------------------

export const preset: Preset = {
    name: '@trapi/example-decorators',
    controllers: [
        controllerControllerHandler,
        controllerMountHandler,
        ...controllerMarkerHandlers,
    ],
    methods: [
        ...methodVerbHandlers,
        methodMountHandler,
        ...methodMarkerHandlers,
    ],
    parameters: [
        ...routingParameterHandlers,
        ...parameterMarkerHandlers,
    ],
    controllerJsDoc: controllerJsDocHandlers,
    methodJsDoc: methodJsDocHandlers,
    parameterJsDoc: parameterJsDocHandlers,
};

export default preset;
