/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { tmpdir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import process from 'node:process';
import { defineCommand } from 'citty';
import { CACHE_FILE_PREFIX, CACHE_FILE_SUFFIX } from '@trapi/metadata';
import {
    CLIUserError,
    LOG_LEVEL_VALUES,
    createLogger,
    normalizeLogLevel,
} from '../logger.ts';
import { runWithExitCode } from '../exit.ts';

export function defineCLICacheCommand() {
    return defineCommand({
        meta: {
            name: 'cache',
            description: 'Manage the metadata cache.',
        },
        subCommands: { clean: defineCacheCleanCommand() },
    });
}

function defineCacheCleanCommand() {
    return defineCommand({
        meta: {
            name: 'clean',
            description: 'Delete cached metadata files (.trapi-metadata-*.json).',
        },
        args: {
            directory: {
                type: 'string',
                description: 'Directory holding the cache files. Defaults to the OS tmpdir.',
                valueHint: '/tmp',
            },
            'max-age': {
                type: 'string',
                description: 'Only delete files older than N milliseconds. Defaults to deleting all.',
                valueHint: '604800000',
            },
            'log-level': {
                type: 'string',
                description: 'Logger verbosity.',
                valueHint: LOG_LEVEL_VALUES.join('|'),
                options: LOG_LEVEL_VALUES as string[],
            },
        },
        async run({ args }) {
            const logger = createLogger(normalizeLogLevel(args['log-level'] as string | undefined));
            await runWithExitCode(logger, async () => {
                const directory = (args.directory as string | undefined) ?? tmpdir();
                const absolute = path.isAbsolute(directory) ?
                    directory :
                    path.resolve(process.cwd(), directory);

                const maxAgeMs = parseMaxAge(args['max-age']);

                const result = await cleanCache({ directory: absolute, maxAgeMs });
                logger.success(
                    `removed ${result.removed} cache file(s) from ${absolute}${
                        result.skipped > 0 ? ` (${result.skipped} retained)` : ''}`,
                );
            });
        },
    });
}

export type CleanCacheOptions = {
    directory: string;
    /** Only remove files older than this many ms. `undefined` removes all. */
    maxAgeMs?: number;
};

export type CleanCacheResult = {
    removed: number;
    skipped: number;
};

export async function cleanCache(options: CleanCacheOptions): Promise<CleanCacheResult> {
    let entries: string[];
    try {
        entries = await fs.readdir(options.directory);
    } catch {
        return { removed: 0, skipped: 0 };
    }

    const cutoff = options.maxAgeMs !== undefined ?
        Date.now() - options.maxAgeMs :
        undefined;

    let removed = 0;
    let skipped = 0;

    for (const name of entries) {
        if (!name.startsWith(CACHE_FILE_PREFIX) || !name.endsWith(CACHE_FILE_SUFFIX)) {
            continue;
        }

        const filePath = path.join(options.directory, name);

        if (cutoff !== undefined) {
            try {
                const stat = await fs.stat(filePath);
                if (stat.mtimeMs > cutoff) {
                    skipped += 1;
                    continue;
                }
            } catch {
                continue;
            }
        }

        try {
            await fs.unlink(filePath);
            removed += 1;
        } catch {
            // ignore — concurrent eviction is fine
        }
    }

    return { removed, skipped };
}

function parseMaxAge(input: unknown): number | undefined {
    if (input === undefined || input === null || input === '') {
        return undefined;
    }
    const parsed = Number(input);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new CLIUserError(`Invalid --max-age "${String(input)}".`);
    }
    return parsed;
}
