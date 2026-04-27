/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type PackageJson = {
    name?: string;
    version?: string;
    description?: string;
};

export async function readPackageJson(): Promise<PackageJson> {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [
        join(here, '..', 'package.json'),
        join(here, '..', '..', 'package.json'),
    ];

    for (const candidate of candidates) {
        try {
            const raw = await readFile(candidate, { encoding: 'utf-8' });
            return JSON.parse(raw) as PackageJson;
        } catch {
            // continue
        }
    }

    return {};
}
