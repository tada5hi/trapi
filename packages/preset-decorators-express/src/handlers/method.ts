/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MethodDraft, MethodHandler } from '@trapi/core';
import {
    MarkerName,
    method,
    readString,
    setMethodPath,
} from '@trapi/core';
import {
    appendConsumes,
    appendExtensionToDraft,
    appendProduces,
    appendSecurityToDraft,
    appendTags,
    applyDescriptionToDraft,
    setDeprecated,
    setHidden,
} from './shared';

// --- HTTP verbs ------------------------------------------------------------

function setVerbAndPath(verb: MethodDraft['verb']): MethodHandler['apply'] {
    return (ctx, draft) => {
        draft.verb = verb;
        setMethodPath(draft, ctx.argument(0));
    };
}

const methodGetHandler = method({ match: { name: 'Get', on: 'method' }, apply: setVerbAndPath('get') });
const methodPostHandler = method({ match: { name: 'Post', on: 'method' }, apply: setVerbAndPath('post') });
const methodPutHandler = method({ match: { name: 'Put', on: 'method' }, apply: setVerbAndPath('put') });
const methodDeleteHandler = method({ match: { name: 'Delete', on: 'method' }, apply: setVerbAndPath('delete') });
const methodPatchHandler = method({ match: { name: 'Patch', on: 'method' }, apply: setVerbAndPath('patch') });
const methodOptionsHandler = method({ match: { name: 'Options', on: 'method' }, apply: setVerbAndPath('options') });
const methodHeadHandler = method({ match: { name: 'Head', on: 'method' }, apply: setVerbAndPath('head') });
// `All` maps to `get` for OpenAPI emission (closest analogue).
const methodAllHandler = method({
    match: { name: 'All', on: 'method' },
    apply: (ctx, draft) => {
        draft.verb = 'get';
        setMethodPath(draft, ctx.argument(0));
    },
});

const methodMountHandler = method({
    match: { name: 'Mount', on: 'method' },
    apply: (ctx, draft) => {
        setMethodPath(draft, ctx.argument(0));
    },
});

// --- TRAPI-specific markers ------------------------------------------------

const methodHiddenHandler = method({
    match: { name: 'Hidden', on: 'method' },
    apply: setHidden,
    marker: MarkerName.Hidden,
});

const methodDeprecatedHandler = method({
    match: { name: 'Deprecated', on: 'method' },
    apply: setDeprecated,
    marker: MarkerName.Deprecated,
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
    marker: MarkerName.Extension,
});

const methodDescriptionHandler = method({
    match: { name: 'Description', on: 'method' },
    apply: (ctx, draft) => applyDescriptionToDraft(ctx, draft),
});

const methodExampleHandler = method({
    match: { name: 'Example', on: 'method' },
    apply: (ctx, draft) => {
        const payload = ctx.argument(0);
        if (!payload || payload.kind === 'unresolvable') {
            return;
        }
        const label = readString(ctx.argument(1));
        draft.defaultResponseExamples.push(
            label === undefined ?
                { value: payload.raw } :
                { value: payload.raw, label },
        );
    },
});

export const methodHandlers: MethodHandler[] = [
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
];
