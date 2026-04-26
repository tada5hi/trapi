/*
 * A worked example of a TRAPI v2 Preset for a small custom decorator library
 * that uses different naming conventions than the canonical @trapi/decorators
 * preset. Look at fixtures/sample.ts to see the controller this preset matches.
 */

import {
    MarkerName,
    ParamKind,
    type Preset,
    append,
    controller,
    flag,
    method,
    parameter,
} from '@trapi/metadata';

const routeController = controller({
    match: { name: 'Route', on: 'class' },
    apply: (ctx, draft) => {
        const arg = ctx.argument(0);
        draft.path = arg && arg.kind === 'literal' && typeof arg.raw === 'string' ?
            arg.raw :
            '';
    },
});

const tagsController = controller({
    match: { name: 'Tags', on: 'class' },
    apply: append('tags').positionalAll(),
});

// Renamed @Skip — but we tag it with the Hidden marker so the type resolver
// still treats class properties decorated with @Skip as hidden.
const skipController = controller({
    match: { name: 'Skip', on: 'class' },
    apply: flag('hidden'),
    marker: MarkerName.Hidden,
});

function setVerb(verb: 'get' | 'post' | 'put' | 'delete'): Parameters<typeof method>[0]['apply'] {
    return (ctx, draft) => {
        draft.verb = verb;
        const path = ctx.argument(0);
        if (path?.kind === 'literal' && typeof path.raw === 'string') {
            draft.path = path.raw;
        }
    };
}

const httpGet = method({ match: { name: 'HttpGet', on: 'method' }, apply: setVerb('get') });
const httpPost = method({ match: { name: 'HttpPost', on: 'method' }, apply: setVerb('post') });

const fromBody = parameter({
    match: { name: 'FromBody', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Body; },
});

const fromQuery = parameter({
    match: { name: 'FromQuery', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = ctx.argument(0);
        if (name?.kind === 'literal' && typeof name.raw === 'string') {
            draft.in = ParamKind.QueryProp;
            draft.name = name.raw;
        } else {
            draft.in = ParamKind.Query;
        }
    },
});

const fromRoute = parameter({
    match: { name: 'FromRoute', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = ctx.argument(0);
        draft.in = ParamKind.Path;
        if (name?.kind === 'literal' && typeof name.raw === 'string') {
            draft.name = name.raw;
        }
    },
});

export const preset: Preset = {
    name: '@trapi/example-custom-preset',
    controllers: [routeController, tagsController, skipController],
    methods: [httpGet, httpPost],
    parameters: [fromBody, fromQuery, fromRoute],
};

export default preset;
