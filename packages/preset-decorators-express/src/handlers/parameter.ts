/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ParameterHandler } from '@trapi/core';
import {
    MarkerName,
    NumericKind,
    ParamKind,
    parameter,
} from '@trapi/core';
import { appendExtensionToDraft, readString } from './shared';

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

function namedClaim(kind: typeof ParamKind[keyof typeof ParamKind]): ParameterHandler['apply'] {
    return (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = kind;
        if (name) draft.name = name;
    };
}

// --- Generic claim-style handlers ------------------------------------------

const parameterBodyHandler = parameter({
    match: { name: 'Body', on: 'parameter' },
    apply: claimParameter(ParamKind.Body, ParamKind.BodyProp),
});

const parameterBodyPropHandler = parameter({
    match: { name: 'BodyProp', on: 'parameter' },
    apply: namedClaim(ParamKind.BodyProp),
});

const parameterQueryHandler = parameter({
    match: { name: 'Query', on: 'parameter' },
    apply: claimParameter(ParamKind.Query, ParamKind.QueryProp),
});

const parameterQueryPropHandler = parameter({
    match: { name: 'QueryProp', on: 'parameter' },
    apply: namedClaim(ParamKind.QueryProp),
});

const parameterPathHandler = parameter({
    match: { name: 'Path', on: 'parameter' },
    apply: namedClaim(ParamKind.Path),
});

const parameterPathParamHandler = parameter({
    match: { name: 'PathParam', on: 'parameter' },
    apply: namedClaim(ParamKind.Path),
});

const parameterCookieHandler = parameter({
    match: { name: 'Cookie', on: 'parameter' },
    apply: namedClaim(ParamKind.Cookie),
});

const parameterHeaderHandler = parameter({
    match: { name: 'Header', on: 'parameter' },
    apply: namedClaim(ParamKind.Header),
});

const parameterFormHandler = parameter({
    match: { name: 'Form', on: 'parameter' },
    apply: namedClaim(ParamKind.FormData),
});

const parameterFormPropHandler = parameter({
    match: { name: 'FormProp', on: 'parameter' },
    apply: namedClaim(ParamKind.FormData),
});

const parameterFileHandler = parameter({
    match: { name: 'File', on: 'parameter' },
    apply: namedClaim(ParamKind.FormData),
});

const parameterFilesHandler = parameter({
    match: { name: 'Files', on: 'parameter' },
    apply: namedClaim(ParamKind.FormData),
});

const parameterParamHandler = parameter({
    match: { name: 'Param', on: 'parameter' },
    apply: namedClaim(ParamKind.Path),
});

// --- Express-specific overrides --------------------------------------------
//
// `@decorators/express` ships `@Headers()`, `@Cookies()`, `@Params()`,
// `@Request`/`@Response`/`@Next` whose semantics differ from a generic
// "claim a parameter slot" mapping.

const requestContextHandler = parameter({
    match: { name: 'Request', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Context; },
});

const responseContextHandler = parameter({
    match: { name: 'Response', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Context; },
});

const nextContextHandler = parameter({
    match: { name: 'Next', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Context; },
});

// `@Headers()` (no arg) binds the entire request headers object → not
// representable as a single OpenAPI parameter, so it's mapped to Context
// (excluded from the spec). `@Headers('x-foo')` binds a single header.
const headersHandler = parameter({
    match: { name: 'Headers', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        if (name !== undefined) {
            draft.in = ParamKind.Header;
            draft.name = name;
        } else {
            draft.in = ParamKind.Context;
        }
    },
});

const cookiesHandler = parameter({
    match: { name: 'Cookies', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        if (name !== undefined) {
            draft.in = ParamKind.Cookie;
            draft.name = name;
        } else {
            draft.in = ParamKind.Context;
        }
    },
});

// `@Params()` reads `req.params` (Express path params). With a name argument
// it claims a single path parameter; without, it binds the whole params object
// (treated as Context here since OpenAPI has no equivalent bulk-binding form).
const paramsHandler = parameter({
    match: { name: 'Params', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        if (name !== undefined) {
            draft.in = ParamKind.Path;
            draft.name = name;
        } else {
            draft.in = ParamKind.Context;
        }
    },
});

// --- TRAPI-specific markers ------------------------------------------------

const parameterExtensionHandler = parameter({
    match: { name: 'Extension', on: 'parameter' },
    apply: (ctx, draft) => appendExtensionToDraft(ctx, draft),
    marker: MarkerName.Extension,
});

// Numeric narrowing handlers — registered via `marker` so the resolver finds
// them and narrows the TS type. Validators carry an OpenAPI `format` hint
// via `meta.openApi`, consumed by the swagger emitter.
function numericValidator(kind: NumericKind, format: string): ParameterHandler['apply'] {
    return (_ctx, draft) => {
        const name = `is${kind[0]!.toUpperCase()}${kind.slice(1)}`;
        draft.validators[name] = {
            value: kind,
            meta: { openApi: { kind: 'format', format } },
        };
    };
}

const parameterIsIntHandler = parameter({
    match: { name: 'IsInt', on: 'parameter' },
    apply: numericValidator('int', 'int32'),
    marker: { numeric: NumericKind.Int },
});
const parameterIsLongHandler = parameter({
    match: { name: 'IsLong', on: 'parameter' },
    apply: numericValidator('long', 'int64'),
    marker: { numeric: NumericKind.Long },
});
const parameterIsFloatHandler = parameter({
    match: { name: 'IsFloat', on: 'parameter' },
    apply: numericValidator('float', 'float'),
    marker: { numeric: NumericKind.Float },
});
const parameterIsDoubleHandler = parameter({
    match: { name: 'IsDouble', on: 'parameter' },
    apply: numericValidator('double', 'double'),
    marker: { numeric: NumericKind.Double },
});

export const parameterHandlers: ParameterHandler[] = [
    parameterBodyHandler,
    parameterBodyPropHandler,
    parameterQueryHandler,
    parameterQueryPropHandler,
    parameterPathHandler,
    parameterPathParamHandler,
    parameterCookieHandler,
    parameterHeaderHandler,
    parameterFormHandler,
    parameterFormPropHandler,
    parameterFileHandler,
    parameterFilesHandler,
    parameterParamHandler,
    requestContextHandler,
    responseContextHandler,
    nextContextHandler,
    headersHandler,
    cookiesHandler,
    paramsHandler,
    parameterExtensionHandler,
    parameterIsIntHandler,
    parameterIsLongHandler,
    parameterIsFloatHandler,
    parameterIsDoubleHandler,
];
