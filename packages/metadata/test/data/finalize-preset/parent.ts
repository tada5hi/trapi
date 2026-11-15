/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Preset } from '@trapi/core';

// A parent preset resolved by path through `extends`: its finalizers record
// themselves in the tags, so a test can read the order they ran in.
export const preset: Preset = {
    name: 'finalize-parent',
    finalizeController: (_ctx, draft) => {
        draft.tags.push('controller:parent');
    },
    finalizeMethod: (_ctx, draft) => {
        draft.tags.push('method:parent');
    },
};
