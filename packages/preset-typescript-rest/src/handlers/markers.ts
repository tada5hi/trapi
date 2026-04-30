/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ControllerHandler,
    MethodHandler,
    ParameterHandler,
} from '@trapi/metadata';
import {
    MarkerName,
    NumericKind,
    controller,
    method,
    parameter,
    setMethodPath,
} from '@trapi/metadata';
import {
    appendConsumes,
    appendExtensionToDraft,
    appendProduces,
    appendTags,
    setDeprecated,
    setHidden,
} from './shared';

// --- Controller-level markers ----------------------------------------------

const controllerHiddenHandler = controller({
    match: { name: 'Hidden', on: 'class' },
    apply: setHidden,
    marker: MarkerName.Hidden,
});

const controllerDeprecatedHandler = controller({
    match: { name: 'Deprecated', on: 'class' },
    apply: setDeprecated,
    marker: MarkerName.Deprecated,
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

const controllerExtensionHandler = controller({
    match: { name: 'Extension', on: 'class' },
    apply: (ctx, draft) => appendExtensionToDraft(ctx, draft),
    marker: MarkerName.Extension,
});

export const controllerMarkerHandlers: ControllerHandler[] = [
    controllerHiddenHandler,
    controllerDeprecatedHandler,
    controllerTagsHandler,
    controllerProducesHandler,
    controllerConsumesHandler,
    controllerAcceptHandler,
    controllerExtensionHandler,
];

// --- Method-level markers --------------------------------------------------

const methodMountHandler = method({
    match: { name: 'Mount', on: 'method' },
    apply: (ctx, draft) => {
        setMethodPath(draft, ctx.argument(0));
    },
});

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

const methodExtensionHandler = method({
    match: { name: 'Extension', on: 'method' },
    apply: (ctx, draft) => appendExtensionToDraft(ctx, draft),
    marker: MarkerName.Extension,
});

export const methodMarkerHandlers: MethodHandler[] = [
    methodMountHandler,
    methodHiddenHandler,
    methodDeprecatedHandler,
    methodTagsHandler,
    methodProducesHandler,
    methodConsumesHandler,
    methodAcceptHandler,
    methodExtensionHandler,
];

// --- Parameter-level markers -----------------------------------------------

const parameterExtensionHandler = parameter({
    match: { name: 'Extension', on: 'parameter' },
    apply: (ctx, draft) => appendExtensionToDraft(ctx, draft),
    marker: MarkerName.Extension,
});

function numericValidator(kind: NumericKind, format: string): ParameterHandler['apply'] {
    return (_ctx, draft) => {
        const name = `is${kind[0].toUpperCase()}${kind.slice(1)}`;
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

export const parameterMarkerHandlers: ParameterHandler[] = [
    parameterExtensionHandler,
    parameterIsIntHandler,
    parameterIsLongHandler,
    parameterIsFloatHandler,
    parameterIsDoubleHandler,
];
