/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ControllerJsDocHandler,
    MethodJsDocHandler,
    ParameterJsDocHandler,
} from '@trapi/metadata';
import {
    MarkerName,
    NumericKind,
    controllerJsDoc,
    methodJsDoc,
    parameterJsDoc,
} from '@trapi/metadata';

const methodHiddenJsDoc = methodJsDoc({
    match: { tag: 'hidden' },
    apply: (_ctx, draft) => { draft.hidden = true; },
    marker: MarkerName.Hidden,
});

const methodDeprecatedJsDoc = methodJsDoc({
    match: { tag: 'deprecated' },
    apply: (_ctx, draft) => { draft.deprecated = true; },
    marker: MarkerName.Deprecated,
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
    marker: MarkerName.Hidden,
});

const parameterDeprecatedJsDoc = parameterJsDoc({
    match: { tag: 'deprecated' },
    apply: (_ctx, draft) => { draft.deprecated = true; },
    marker: MarkerName.Deprecated,
});

// Numeric JSDoc tags. The apply is a no-op — the type resolver consumes these
// via the `marker` field at type-resolution time (not at parameter-generation
// time), so `match.tag` is the only field that needs to be authoritative.
const noopJsDoc = () => { /* marker-only handler */ };

const parameterIsIntJsDoc = parameterJsDoc({
    match: { tag: 'isInt' },
    apply: noopJsDoc,
    marker: { numeric: NumericKind.Int },
});
const parameterIsLongJsDoc = parameterJsDoc({
    match: { tag: 'isLong' },
    apply: noopJsDoc,
    marker: { numeric: NumericKind.Long },
});
const parameterIsFloatJsDoc = parameterJsDoc({
    match: { tag: 'isFloat' },
    apply: noopJsDoc,
    marker: { numeric: NumericKind.Float },
});
const parameterIsDoubleJsDoc = parameterJsDoc({
    match: { tag: 'isDouble' },
    apply: noopJsDoc,
    marker: { numeric: NumericKind.Double },
});

export const controllerJsDocHandlers: ControllerJsDocHandler[] = [
    controllerHiddenJsDoc,
];

export const methodJsDocHandlers: MethodJsDocHandler[] = [
    methodHiddenJsDoc,
    methodDeprecatedJsDoc,
    methodSummaryJsDoc,
];

export const parameterJsDocHandlers: ParameterJsDocHandler[] = [
    parameterDeprecatedJsDoc,
    parameterIsIntJsDoc,
    parameterIsLongJsDoc,
    parameterIsFloatJsDoc,
    parameterIsDoubleJsDoc,
];
