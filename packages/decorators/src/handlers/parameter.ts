/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ParameterHandler } from '@trapi/metadata';
import {
    MarkerName,
    NumericKind,
    ParamKind,
    parameter,
} from '@trapi/metadata';
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

function bulkClaim(kind: typeof ParamKind[keyof typeof ParamKind]): ParameterHandler['apply'] {
    return (_ctx, draft) => {
        draft.in = kind;
    };
}

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

const parameterPathParamsHandler = parameter({
    match: { name: 'PathParams', on: 'parameter' },
    apply: bulkClaim(ParamKind.Path),
});

const parameterCookieHandler = parameter({
    match: { name: 'Cookie', on: 'parameter' },
    apply: namedClaim(ParamKind.Cookie),
});

const parameterCookiesHandler = parameter({
    match: { name: 'Cookies', on: 'parameter' },
    apply: bulkClaim(ParamKind.Cookie),
});

const parameterHeaderHandler = parameter({
    match: { name: 'Header', on: 'parameter' },
    apply: namedClaim(ParamKind.Header),
});

const parameterHeadersHandler = parameter({
    match: { name: 'Headers', on: 'parameter' },
    apply: bulkClaim(ParamKind.Header),
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

const parameterParamsHandler = parameter({
    match: { name: 'Params', on: 'parameter' },
    apply: bulkClaim(ParamKind.Path),
});

const parameterContextHandler = parameter({
    match: { name: 'Context', on: 'parameter' },
    apply: bulkClaim(ParamKind.Context),
});

const parameterExtensionHandler = parameter({
    match: { name: 'Extension', on: 'parameter' },
    apply: (ctx, draft) => appendExtensionToDraft(ctx, draft),
    marker: MarkerName.Extension,
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
    marker: { numeric: NumericKind.Int },
});
const parameterIsLongHandler = parameter({
    match: { name: 'IsLong', on: 'parameter' },
    apply: numericValidator('long'),
    marker: { numeric: NumericKind.Long },
});
const parameterIsFloatHandler = parameter({
    match: { name: 'IsFloat', on: 'parameter' },
    apply: numericValidator('float'),
    marker: { numeric: NumericKind.Float },
});
const parameterIsDoubleHandler = parameter({
    match: { name: 'IsDouble', on: 'parameter' },
    apply: numericValidator('double'),
    marker: { numeric: NumericKind.Double },
});

export const parameterHandlers: ParameterHandler[] = [
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
];
