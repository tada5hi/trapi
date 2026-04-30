/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ControllerHandler } from '@trapi/metadata';
import {
    MarkerName,
    controller,
    readStringOrStringArray,
    setControllerPaths,
} from '@trapi/metadata';
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

// --- HTTP routing ----------------------------------------------------------

const controllerControllerHandler = controller({
    match: { name: 'Controller', on: 'class' },
    apply: (ctx, draft) => {
        setControllerPaths(draft, ctx.argument(0));
    },
});

const controllerMountHandler = controller({
    match: { name: 'Mount', on: 'class' },
    apply: (ctx, draft) => {
        const paths = readStringOrStringArray(ctx.argument(0));
        if (paths !== undefined) {
            draft.paths = paths;
        }
    },
});

// --- TRAPI-specific markers ------------------------------------------------

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

const controllerSecurityHandler = controller({
    match: { name: 'Security', on: 'class' },
    apply: (ctx, draft) => appendSecurityToDraft(ctx, draft),
});

const controllerExtensionHandler = controller({
    match: { name: 'Extension', on: 'class' },
    apply: (ctx, draft) => appendExtensionToDraft(ctx, draft),
    marker: MarkerName.Extension,
});

const controllerDescriptionHandler = controller({
    match: { name: 'Description', on: 'class' },
    apply: (ctx, draft) => applyDescriptionToDraft(ctx, draft),
});

export const controllerHandlers: ControllerHandler[] = [
    controllerControllerHandler,
    controllerMountHandler,
    controllerHiddenHandler,
    controllerDeprecatedHandler,
    controllerTagsHandler,
    controllerProducesHandler,
    controllerConsumesHandler,
    controllerAcceptHandler,
    controllerSecurityHandler,
    controllerExtensionHandler,
    controllerDescriptionHandler,
];
