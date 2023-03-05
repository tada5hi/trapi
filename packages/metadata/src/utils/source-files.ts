/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocatorInfo } from 'locter';
import { buildFilePath, locateMany } from 'locter';
import type { EntryPoint } from '../config';

export async function scanSourceFiles(input: EntryPoint) : Promise<string[]> {
    const sources = Array.isArray(input) ? input : [input];
    const result: Set<string> = new Set<string>();

    const promises : Promise<LocatorInfo[]>[] = [];

    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];

        if (typeof source === 'string') {
            promises.push(locateMany(source));
        } else {
            promises.push(locateMany(source.pattern, { path: source.cwd }));
        }
    }

    const groupMatches = await Promise.all(promises);
    const matches = groupMatches.flat();

    for (let j = 0; j < matches.length; j++) {
        result.add(buildFilePath(matches[j]));
    }

    return Array.from(result);
}
