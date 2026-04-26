/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Preset } from '../../../../src/adapters/decorator';

const here = path.dirname(fileURLToPath(import.meta.url));

export const preset: Preset = {
    name: 'fixture-extends',
    extends: [path.resolve(here, './preset-named.ts')],
    methods: [
        {
            match: { name: 'Put', on: 'method' },
            apply: (_ctx, draft) => { draft.verb = 'put'; },
        },
    ],
};
