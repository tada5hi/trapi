/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrapiConfig } from './types.ts';

/**
 * Identity helper that gives type safety + IDE autocompletion when authoring
 * a `trapi.config.ts` file. Accepts a single entry or an array (multi-target).
 */
export function defineConfig<T extends TrapiConfig>(config: T): T {
    return config;
}
