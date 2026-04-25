/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type ControllerDraft,
    type DecoratorArgument,
    type HandlerContext,
    type MethodDraft,
    type MethodHandler,
    ParamKind,
    type ParameterDraft,
    type ParameterHandler,
    type Preset,
    append,
    controller,
    controllerJsDoc,
    method,
    methodJsDoc,
    parameter,
    parameterJsDoc,
} from '@trapi/metadata';

// -----------------------------------------------------------------------------
// Shared apply helpers (used by handlers that target both class and method)
// -----------------------------------------------------------------------------

const setHidden = (_ctx: HandlerContext, draft: { hidden: boolean }) => {
    draft.hidden = true;
};

const setDeprecated = (_ctx: HandlerContext, draft: { deprecated?: boolean }) => {
    draft.deprecated = true;
};

const appendTags = append('tags').positionalAll();
const appendProduces = append('produces').positionalAll();
const appendConsumes = append('consumes').positionalAll();

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

// -----------------------------------------------------------------------------
// Controller / class handlers
// -----------------------------------------------------------------------------

const controllerControllerHandler = controller({
    match: { name: 'Controller', on: 'class' },
    apply: (ctx, draft) => {
        const path = readString(ctx.argument(0));
        draft.path = path ?? '';
    },
});

const controllerMountHandler = controller({
    match: { name: 'Mount', on: 'class' },
    apply: (ctx, draft) => {
        const path = readString(ctx.argument(0));
        if (path !== undefined) {
            draft.path = path;
        }
    },
});

const controllerHiddenHandler = controller({
    match: { name: 'Hidden', on: 'class' },
    apply: setHidden,
});

const controllerTagsHandler = controller({
    match: { name: 'Tags', on: 'class' },
    apply: appendTags,
});

const controllerProducesHandler = controller({
    match: { name: 'Produces', on: 'class' },
    apply: appendProduces,
});

const controllerConsumesHandler = controller({
    match: { name: 'Consumes', on: 'class' },
    apply: appendConsumes,
});

const controllerAcceptHandler = controller({
    match: { name: 'Accept', on: 'class' },
    apply: appendConsumes,
});

const controllerSecurityHandler = controller({
    match: { name: 'Security', on: 'class' },
    apply: (ctx, draft) => appendSecurityToDraft(ctx, draft),
});

const controllerExtensionHandler = controller({
    match: { name: 'Extension', on: 'class' },
    apply: (ctx, draft) => appendExtensionToDraft(ctx, draft),
});

// -----------------------------------------------------------------------------
// Method handlers
// -----------------------------------------------------------------------------

function setVerbAndPath(verb: MethodDraft['verb']): MethodHandler['apply'] {
    return (ctx, draft) => {
        draft.verb = verb;
        const path = readString(ctx.argument(0));
        if (path !== undefined) {
            draft.path = path;
        }
    };
}

const methodGetHandler = method({ match: { name: 'Get', on: 'method' }, apply: setVerbAndPath('get') });
const methodPostHandler = method({ match: { name: 'Post', on: 'method' }, apply: setVerbAndPath('post') });
const methodPutHandler = method({ match: { name: 'Put', on: 'method' }, apply: setVerbAndPath('put') });
const methodDeleteHandler = method({ match: { name: 'Delete', on: 'method' }, apply: setVerbAndPath('delete') });
const methodPatchHandler = method({ match: { name: 'Patch', on: 'method' }, apply: setVerbAndPath('patch') });
const methodOptionsHandler = method({ match: { name: 'Options', on: 'method' }, apply: setVerbAndPath('options') });
const methodHeadHandler = method({ match: { name: 'Head', on: 'method' }, apply: setVerbAndPath('head') });
// `All` maps to `get` for OpenAPI purposes (closest analogue) — same as v1 behaviour.
const methodAllHandler = method({
    match: { name: 'All', on: 'method' },
    apply: (ctx, draft) => {
        draft.verb = 'get';
        const path = readString(ctx.argument(0));
        if (path !== undefined) {
            draft.path = path;
        }
    },
});

const methodMountHandler = method({
    match: { name: 'Mount', on: 'method' },
    apply: (ctx, draft) => {
        const path = readString(ctx.argument(0));
        if (path !== undefined) {
            draft.path = path;
        }
    },
});

const methodHiddenHandler = method({
    match: { name: 'Hidden', on: 'method' },
    apply: setHidden,
});

const methodDeprecatedHandler = method({
    match: { name: 'Deprecated', on: 'method' },
    apply: setDeprecated,
});

const methodTagsHandler = method({
    match: { name: 'Tags', on: 'method' },
    apply: appendTags,
});

const methodProducesHandler = method({
    match: { name: 'Produces', on: 'method' },
    apply: appendProduces,
});

const methodConsumesHandler = method({
    match: { name: 'Consumes', on: 'method' },
    apply: appendConsumes,
});

const methodAcceptHandler = method({
    match: { name: 'Accept', on: 'method' },
    apply: appendConsumes,
});

const methodSecurityHandler = method({
    match: { name: 'Security', on: 'method' },
    apply: (ctx, draft) => appendSecurityToDraft(ctx, draft),
});

const methodExtensionHandler = method({
    match: { name: 'Extension', on: 'method' },
    apply: (ctx, draft) => appendExtensionToDraft(ctx, draft),
});

const methodDescriptionHandler = method({
    match: { name: 'Description', on: 'method' },
    apply: (ctx, draft) => {
        const status = readString(ctx.argument(0)) ?? String(readNumber(ctx.argument(0)) ?? '200');
        const description = readString(ctx.argument(1)) ?? 'Ok';
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
    },
});

const methodExampleHandler = method({
    match: { name: 'Example', on: 'method' },
    apply: (ctx, draft) => {
        const payload = ctx.argument(0);
        if (!payload || payload.kind === 'unresolvable') {
            return;
        }
        const label = readString(ctx.argument(1));
        // Stash example on the draft via extensions until the orchestrator merges it
        // into the default 200-response.
        draft.extensions.push({
            key: '__trapi_example__',
            value: { value: payload.raw, label } as never,
        });
    },
});

// -----------------------------------------------------------------------------
// Parameter handlers
// -----------------------------------------------------------------------------

function claimParameter(
    kind: typeof ParamKind[keyof typeof ParamKind],
    namedKind?: typeof ParamKind[keyof typeof ParamKind],
): ParameterHandler['apply'] {
    return (ctx, draft) => {
        const argName = readString(ctx.argument(0));
        if (argName !== undefined && namedKind) {
            draft.in = namedKind;
            draft.name = argName;
        } else {
            draft.in = kind;
            if (argName !== undefined) {
                draft.name = argName;
            }
        }
    };
}

const parameterBodyHandler = parameter({
    match: { name: 'Body', on: 'parameter' },
    apply: claimParameter(ParamKind.Body, ParamKind.BodyProp),
});

const parameterBodyPropHandler = parameter({
    match: { name: 'BodyProp', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.BodyProp;
        if (name) draft.name = name;
    },
});

const parameterQueryHandler = parameter({
    match: { name: 'Query', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        if (name !== undefined) {
            draft.in = ParamKind.Query;
            draft.name = name;
        } else {
            draft.in = ParamKind.QueryProp;
        }
    },
});

const parameterQueryPropHandler = parameter({
    match: { name: 'QueryProp', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.QueryProp;
        if (name) draft.name = name;
    },
});

const parameterPathHandler = parameter({
    match: { name: 'Path', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.Path;
        if (name) draft.name = name;
    },
});

const parameterPathParamHandler = parameter({
    match: { name: 'PathParam', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.Path;
        if (name) draft.name = name;
    },
});

const parameterPathParamsHandler = parameter({
    match: { name: 'PathParams', on: 'parameter' },
    apply: (_ctx, draft) => {
        draft.in = ParamKind.Path;
    },
});

const parameterCookieHandler = parameter({
    match: { name: 'Cookie', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.Cookie;
        if (name) draft.name = name;
    },
});

const parameterCookiesHandler = parameter({
    match: { name: 'Cookies', on: 'parameter' },
    apply: (_ctx, draft) => {
        draft.in = ParamKind.Cookie;
    },
});

const parameterHeaderHandler = parameter({
    match: { name: 'Header', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.Header;
        if (name) draft.name = name;
    },
});

const parameterHeadersHandler = parameter({
    match: { name: 'Headers', on: 'parameter' },
    apply: (_ctx, draft) => {
        draft.in = ParamKind.Header;
    },
});

const parameterFormHandler = parameter({
    match: { name: 'Form', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.FormData;
        if (name) draft.name = name;
    },
});

const parameterFormPropHandler = parameter({
    match: { name: 'FormProp', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.FormData;
        if (name) draft.name = name;
    },
});

const parameterFileHandler = parameter({
    match: { name: 'File', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.FormData;
        if (name) draft.name = name;
    },
});

const parameterFilesHandler = parameter({
    match: { name: 'Files', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.FormData;
        if (name) draft.name = name;
    },
});

const parameterParamHandler = parameter({
    match: { name: 'Param', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.Path;
        if (name) draft.name = name;
    },
});

const parameterParamsHandler = parameter({
    match: { name: 'Params', on: 'parameter' },
    apply: (_ctx, draft) => {
        draft.in = ParamKind.Path;
    },
});

const parameterContextHandler = parameter({
    match: { name: 'Context', on: 'parameter' },
    apply: (_ctx, draft) => {
        draft.in = ParamKind.Context;
    },
});

const parameterExtensionHandler = parameter({
    match: { name: 'Extension', on: 'parameter' },
    apply: (ctx, draft) => appendExtensionToDraft(ctx, draft),
});

// Numeric type-narrowing handlers store an intent on validators; the orchestrator
// (or swagger emitter) consumes them when shaping the parameter's emitted type.
function numericValidator(kind: 'int' | 'long' | 'float' | 'double'): ParameterHandler['apply'] {
    return (_ctx, draft) => {
        draft.validators[`is${kind[0].toUpperCase()}${kind.slice(1)}`] = { value: kind };
    };
}

const parameterIsIntHandler = parameter({
    match: { name: 'IsInt', on: 'parameter' },
    apply: numericValidator('int'),
});
const parameterIsLongHandler = parameter({
    match: { name: 'IsLong', on: 'parameter' },
    apply: numericValidator('long'),
});
const parameterIsFloatHandler = parameter({
    match: { name: 'IsFloat', on: 'parameter' },
    apply: numericValidator('float'),
});
const parameterIsDoubleHandler = parameter({
    match: { name: 'IsDouble', on: 'parameter' },
    apply: numericValidator('double'),
});

// -----------------------------------------------------------------------------
// JSDoc handlers
// -----------------------------------------------------------------------------

const methodHiddenJsDoc = methodJsDoc({
    match: { tag: 'hidden' },
    apply: (_ctx, draft) => { draft.hidden = true; },
});

const methodDeprecatedJsDoc = methodJsDoc({
    match: { tag: 'deprecated' },
    apply: (_ctx, draft) => { draft.deprecated = true; },
});

const methodSummaryJsDoc = methodJsDoc({
    match: { tag: 'summary' },
    apply: (ctx, draft) => {
        if (ctx.source.text) draft.summary = ctx.source.text;
    },
});

const controllerHiddenJsDoc = controllerJsDoc({
    match: { tag: 'hidden' },
    apply: (_ctx, draft) => { draft.hidden = true; },
});

const parameterDeprecatedJsDoc = parameterJsDoc({
    match: { tag: 'deprecated' },
    apply: (_ctx, draft) => { draft.deprecated = true; },
});

// -----------------------------------------------------------------------------
// Shared draft mutators (defined out-of-order to keep the handler list readable)
// -----------------------------------------------------------------------------

function appendSecurityToDraft(
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
                return;
            }
        }
        name = 'default';
    }

    const scopes: string[] = [];
    if (scopesArg?.kind === 'array' && Array.isArray(scopesArg.raw)) {
        for (const item of scopesArg.raw) {
            if (typeof item === 'string') scopes.push(item);
        }
    } else if (scopesArg?.kind === 'literal' && typeof scopesArg.raw === 'string') {
        scopes.push(scopesArg.raw);
    }

    draft.security ??= [];
    draft.security.push({ [name]: scopes });
}

function appendExtensionToDraft(
    ctx: HandlerContext,
    draft: ControllerDraft | MethodDraft | ParameterDraft,
): void {
    const keyArg = ctx.argument(0);
    const valueArg = ctx.argument(1);
    const key = readString(keyArg);
    if (!key || !valueArg) {
        return;
    }
    draft.extensions.push({ key, value: valueArg.raw as never });
}

// -----------------------------------------------------------------------------
// Assembled preset
// -----------------------------------------------------------------------------

export const preset: Preset = {
    name: '@trapi/decorators',
    controllers: [
        controllerControllerHandler,
        controllerMountHandler,
        controllerHiddenHandler,
        controllerTagsHandler,
        controllerProducesHandler,
        controllerConsumesHandler,
        controllerAcceptHandler,
        controllerSecurityHandler,
        controllerExtensionHandler,
    ],
    methods: [
        methodGetHandler,
        methodPostHandler,
        methodPutHandler,
        methodDeleteHandler,
        methodPatchHandler,
        methodOptionsHandler,
        methodHeadHandler,
        methodAllHandler,
        methodMountHandler,
        methodHiddenHandler,
        methodDeprecatedHandler,
        methodTagsHandler,
        methodProducesHandler,
        methodConsumesHandler,
        methodAcceptHandler,
        methodSecurityHandler,
        methodExtensionHandler,
        methodDescriptionHandler,
        methodExampleHandler,
    ],
    parameters: [
        parameterBodyHandler,
        parameterBodyPropHandler,
        parameterQueryHandler,
        parameterQueryPropHandler,
        parameterPathHandler,
        parameterPathParamHandler,
        parameterPathParamsHandler,
        parameterCookieHandler,
        parameterCookiesHandler,
        parameterHeaderHandler,
        parameterHeadersHandler,
        parameterFormHandler,
        parameterFormPropHandler,
        parameterFileHandler,
        parameterFilesHandler,
        parameterParamHandler,
        parameterParamsHandler,
        parameterContextHandler,
        parameterExtensionHandler,
        parameterIsIntHandler,
        parameterIsLongHandler,
        parameterIsFloatHandler,
        parameterIsDoubleHandler,
    ],
    controllerJsDoc: [controllerHiddenJsDoc],
    methodJsDoc: [methodHiddenJsDoc, methodDeprecatedJsDoc, methodSummaryJsDoc],
    parameterJsDoc: [parameterDeprecatedJsDoc],
};
