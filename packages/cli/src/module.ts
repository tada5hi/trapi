/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import { readPackageJson } from './utils.ts';
import { defineCLIGenerateCommand } from './commands';

export async function createCLIEntryPointCommand() {
    const pkg = await readPackageJson();

    return defineCommand({
        meta: {
            name: pkg.name ?? '@trapi/cli',
            version: pkg.version ?? '0.0.0',
            description: pkg.description ?? 'CLI for the trapi metadata + swagger pipeline.',
        },
        subCommands: { generate: defineCLIGenerateCommand() },
    });
}
