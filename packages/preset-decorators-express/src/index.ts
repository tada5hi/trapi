/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ParamKind,
    type Preset,
    parameter,
} from '@trapi/metadata';

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

const headersBulkHandler = parameter({
    match: { name: 'Headers', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Header; },
});

const cookiesBulkHandler = parameter({
    match: { name: 'Cookies', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Cookie; },
});

// `@Params()` in @decorators/express reads `req.params` (Express path params).
const paramsBulkHandler = parameter({
    match: { name: 'Params', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Path; },
});

const preset: Preset = {
    name: '@trapi/preset-decorators-express',
    extends: ['@trapi/decorators'],
    parameters: [
        requestContextHandler,
        responseContextHandler,
        nextContextHandler,
        headersBulkHandler,
        cookiesBulkHandler,
        paramsBulkHandler,
    ],
};

export { preset };
export default preset;
