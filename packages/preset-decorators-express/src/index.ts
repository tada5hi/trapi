/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type DecoratorArgument,
    ParamKind,
    type Preset,
    parameter,
} from '@trapi/metadata';

function readString(arg: DecoratorArgument | undefined): string | undefined {
    if (!arg) return undefined;
    if (arg.kind === 'literal' && typeof arg.raw === 'string') return arg.raw;
    if (arg.kind === 'identifier' && typeof arg.raw === 'string') return arg.raw;
    return undefined;
}

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

const preset: Preset = {
    name: '@trapi/preset-decorators-express',
    extends: ['@trapi/decorators'],
    parameters: [
        requestContextHandler,
        responseContextHandler,
        nextContextHandler,
        headersHandler,
        cookiesHandler,
        paramsHandler,
    ],
};

export { preset };
export default preset;
