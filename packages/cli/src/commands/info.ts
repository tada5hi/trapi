/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { defineCommand } from 'citty';
import { LOG_LEVEL_VALUES, createLogger, normalizeLogLevel } from '../logger.ts';
import { runWithExitCode } from '../exit.ts';
import { loadConfig } from '../config';
import { readPackageJson } from '../utils.ts';

const DEPENDENCIES = ['@trapi/core', '@trapi/metadata', '@trapi/swagger', 'typescript'];

export function defineCLIInfoCommand() {
    return defineCommand({
        meta: {
            name: 'info',
            description: 'Print version and environment diagnostics for bug reports.',
        },
        args: {
            cwd: {
                type: 'string',
                description: 'Working directory used for config discovery.',
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
                const cwd = (args.cwd as string | undefined) ?? process.cwd();
                const cli = await readPackageJson();
                const versions = await readDependencyVersions(cwd);
                const loaded = await loadConfig({ cwd });

                logger.info(`trapi v${cli.version ?? '?'}`);

                logger.section('Environment');
                const envPad = 'platform'.length;
                logger.kv('node', process.version, envPad);
                logger.kv('platform', `${process.platform} ${process.arch}`, envPad);
                logger.kv('cwd', cwd, envPad);

                logger.section('Config');
                const cfgPad = 'entries'.length;
                logger.kv('file', loaded.path ?? '<none>', cfgPad);
                logger.kv('entries', String(loaded.entries.length), cfgPad);

                logger.section('Dependencies');
                const depPad = Math.max(...DEPENDENCIES.map((name) => name.length));
                for (const name of DEPENDENCIES) {
                    logger.kv(name, versions[name] ?? '<not installed>', depPad);
                }

                logger.blank();
            });
        },
    });
}

async function readDependencyVersions(cwd: string): Promise<Record<string, string | undefined>> {
    const out: Record<string, string | undefined> = {};
    for (const name of DEPENDENCIES) {
        out[name] = await readVersion(cwd, name);
    }
    return out;
}

async function readVersion(cwd: string, name: string): Promise<string | undefined> {
    let dir = cwd;
    while (true) {
        const pkgPath = path.join(dir, 'node_modules', name, 'package.json');
        try {
            const raw = await fs.readFile(pkgPath, 'utf-8');
            const parsed = JSON.parse(raw) as { version?: string };
            return parsed.version;
        } catch {
            // not here
        }
        const parent = path.dirname(dir);
        if (parent === dir) {
            return undefined;
        }
        dir = parent;
    }
}
