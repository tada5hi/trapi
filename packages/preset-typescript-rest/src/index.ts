/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type ControllerHandler,
    type MethodHandler,
    ParamKind,
    type Preset,
    controller,
    method,
    parameter,
} from '@trapi/metadata';
import {
    controllerMarkerHandlers,
    methodMarkerHandlers,
    parameterMarkerHandlers,
} from './handlers/markers';
import {
    controllerJsDocHandlers,
    methodJsDocHandlers,
    parameterJsDocHandlers,
} from './handlers/jsdoc';

// `@Path('users')` on a class is the controller-route declaration in
// typescript-rest. We map it to two handlers (one for class, one for method)
// because the same decorator name is reused for `@Path('/:id')` on methods.

function readStringArg(ctx: Parameters<ControllerHandler['apply']>[0]): string | undefined {
    const arg = ctx.argument(0);
    if (!arg) return undefined;
    if (arg.kind === 'literal' && typeof arg.raw === 'string') return arg.raw;
    if (arg.kind === 'identifier' && typeof arg.raw === 'string') return arg.raw;
    return undefined;
}

function readStringOrArrayArg(ctx: Parameters<ControllerHandler['apply']>[0]): string[] | undefined {
    const single = readStringArg(ctx);
    if (single !== undefined) return [single];
    const arg = ctx.argument(0);
    if (arg?.kind === 'array' && Array.isArray(arg.raw)) {
        const out: string[] = [];
        for (const item of arg.raw) {
            if (typeof item === 'string') out.push(item);
        }
        return out;
    }
    return undefined;
}

const controllerPathHandler = controller({
    match: { name: 'Path', on: 'class' },
    apply: (ctx, draft) => {
        draft.paths = readStringOrArrayArg(ctx) ?? [''];
    },
});

const methodPathHandler = method({
    match: { name: 'Path', on: 'method' },
    apply: (ctx, draft) => {
        const path = readStringArg(ctx);
        if (path !== undefined) {
            draft.path = path;
        }
    },
});

function verb(verbValue: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'): MethodHandler['apply'] {
    return (_ctx, draft) => { draft.verb = verbValue; };
}

const methodGet = method({ match: { name: 'GET', on: 'method' }, apply: verb('get') });
const methodPost = method({ match: { name: 'POST', on: 'method' }, apply: verb('post') });
const methodPut = method({ match: { name: 'PUT', on: 'method' }, apply: verb('put') });
const methodDelete = method({ match: { name: 'DELETE', on: 'method' }, apply: verb('delete') });
const methodPatch = method({ match: { name: 'PATCH', on: 'method' }, apply: verb('patch') });
const methodOptions = method({ match: { name: 'OPTIONS', on: 'method' }, apply: verb('options') });
const methodHead = method({ match: { name: 'HEAD', on: 'method' }, apply: verb('head') });
// typescript-rest's `@ALL` maps to `get` for OpenAPI emission (closest analogue).
const methodAll = method({ match: { name: 'ALL', on: 'method' }, apply: verb('get') });

// Context-style parameters from typescript-rest.
const contextNames = [
    'ContextRequest',
    'ContextResponse',
    'ContextNext',
    'ContextLanguage',
    'ContextAccept',
];
const contextHandlers = contextNames.map((name) => parameter({
    match: { name, on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Context; },
}));

function paramHandler(name: string, kind: typeof ParamKind[keyof typeof ParamKind]) {
    return parameter({
        match: { name, on: 'parameter' },
        apply: (ctx, draft) => {
            draft.in = kind;
            const argName = readStringArg(ctx);
            if (argName) draft.name = argName;
        },
    });
}

const queryParamHandler = paramHandler('QueryParam', ParamKind.QueryProp);
const headerParamHandler = paramHandler('HeaderParam', ParamKind.Header);
const cookieParamHandler = paramHandler('CookieParam', ParamKind.Cookie);
const pathParamHandler = paramHandler('PathParam', ParamKind.Path);
const fileParamHandler = paramHandler('FileParam', ParamKind.FormData);
const filesParamHandler = paramHandler('FilesParam', ParamKind.FormData);
// typescript-rest's `@Param` reads from query string OR form. OpenAPI can only
// represent one source per parameter, so we map it to `QueryProp` — the more
// common case. Form-only usage is not faithfully represented; users wanting
// form binding should switch to `@FormParam`.
const paramHandlerEntry = paramHandler('Param', ParamKind.QueryProp);

// `@Description<Type>(status, description, payload)` — typescript-rest shape.
const methodDescription = method({
    match: { name: 'Description', on: 'method' },
    apply: (ctx, draft) => {
        const statusArg = ctx.argument(0);
        let status = '200';
        if (statusArg?.kind === 'literal' && typeof statusArg.raw === 'string') {
            status = statusArg.raw;
        } else if (statusArg?.kind === 'literal' && typeof statusArg.raw === 'number') {
            status = String(statusArg.raw);
        }
        const descriptionArg = ctx.argument(1);
        const description = descriptionArg?.kind === 'literal' && typeof descriptionArg.raw === 'string' ?
            descriptionArg.raw :
            'Ok';
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

const methodExample = method({
    match: { name: 'Example', on: 'method' },
    apply: (ctx, draft) => {
        const payload = ctx.argument(0);
        if (!payload || payload.kind === 'unresolvable') return;
        draft.defaultResponseExamples.push({ value: payload.raw });
    },
});

const methodSecurity = method({
    match: { name: 'Security', on: 'method' },
    apply: (ctx, draft) => {
        const scopesArg = ctx.argument(0);
        const nameArg = ctx.argument(1);
        const name = nameArg?.kind === 'literal' && typeof nameArg.raw === 'string' ?
            nameArg.raw :
            'default';
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
    },
});

const preset: Preset = {
    name: '@trapi/preset-typescript-rest',
    controllers: [
        controllerPathHandler,
        ...controllerMarkerHandlers,
    ],
    methods: [
        methodPathHandler,
        methodGet,
        methodPost,
        methodPut,
        methodDelete,
        methodPatch,
        methodOptions,
        methodHead,
        methodAll,
        methodDescription,
        methodExample,
        methodSecurity,
        ...methodMarkerHandlers,
    ],
    parameters: [
        ...contextHandlers,
        queryParamHandler,
        headerParamHandler,
        cookieParamHandler,
        pathParamHandler,
        fileParamHandler,
        filesParamHandler,
        paramHandlerEntry,
        ...parameterMarkerHandlers,
    ],
    controllerJsDoc: controllerJsDocHandlers,
    methodJsDoc: methodJsDocHandlers,
    parameterJsDoc: parameterJsDocHandlers,
};

export { preset };
export default preset;
