/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';

export function generatePresetLookupPaths(input: string) : string[] {
    if (path.isAbsolute(input) || input.startsWith('./')) {
        return [input];
    }

    if (input.startsWith('module:')) {
        return [input.substring(0, 'module:'.length)];
    }

    if (!input.startsWith('@')) {
        return [input, `@trapi/${input}`];
    }

    return [input];
}
