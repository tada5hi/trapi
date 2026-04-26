/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Preset } from '../../../../src/adapters/decorator';

export const preset: Preset = {
    name: 'fixture-named',
    methods: [
        {
            match: { name: 'Get', on: 'method' },
            apply: (_ctx, draft) => { draft.verb = 'get'; },
        },
    ],
};
