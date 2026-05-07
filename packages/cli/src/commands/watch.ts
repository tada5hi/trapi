/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import path from 'node:path';
import fsp from 'node:fs/promises';
import { defineCommand } from 'citty';
import { watch as chokidarWatch } from 'chokidar';
import type { EntryPoint, EntryPointOptions } from '@trapi/metadata';
import { createLogger, normalizeLogLevel } from '../logger.ts';
import { runWithExitCode } from '../exit.ts';
import type { ResolvedTargets } from './generate.ts';
import { GENERATE_ARGS, resolveTargets, runGenerate } from './generate.ts';

const DEBOUNCE_MS = 200;

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage'];

export function defineCLIWatchCommand() {
    return defineCommand({
        meta: {
            name: 'watch',
            description: 'Re-run `generate` when source files or the config change.',
        },
        args: {
            ...GENERATE_ARGS,
            clear: {
                type: 'boolean',
                description: 'Clear the console between runs.',
                default: false,
            },
        },
        async run({ args }) {
            const logger = createLogger(normalizeLogLevel(args['log-level'] as string | undefined));
            await runWithExitCode(logger, async () => {
                const resolved = await resolveTargets(args);
                const watchRoots = await collectWatchRoots(resolved);

                logger.info(`watching ${watchRoots.length} root(s) — press Ctrl+C to exit`);
                for (const root of watchRoots) {
                    logger.debug(`watch root: ${root}`);
                }

                // Output paths from the most recent run; ignored by the watcher
                // so we don't loop on our own writes.
                const knownOutputs = new Set<string>();

                let running = false;
                let pending = false;

                const runOnce = async () => {
                    running = true;
                    if (args.clear === true) {
                        process.stdout.write('\x1Bc');
                    }
                    try {
                        const results = await runGenerate(args, logger);
                        knownOutputs.clear();
                        for (const r of results) {
                            knownOutputs.add(r.output.path);
                        }
                    } catch (err) {
                        logger.error(err instanceof Error ? err.message : String(err));
                    } finally {
                        running = false;
                        if (pending) {
                            pending = false;
                            void runOnce();
                        }
                    }
                };

                let timer: NodeJS.Timeout | undefined;
                const schedule = () => {
                    if (running) {
                        pending = true;
                        return;
                    }
                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(() => { void runOnce(); }, DEBOUNCE_MS);
                };

                const watcher = chokidarWatch(watchRoots, {
                    ignored: (filePath) => {
                        if (knownOutputs.has(filePath)) {
                            return true;
                        }
                        return IGNORED_DIRS.some((dir) => filePath.includes(`${path.sep}${dir}${path.sep}`));
                    },
                    ignoreInitial: true,
                    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
                });

                watcher.on('all', schedule);
                watcher.on('error', (err) => {
                    logger.warn(`watcher error: ${err instanceof Error ? err.message : String(err)}`);
                });

                await runOnce();

                await new Promise<void>((resolve) => {
                    const cleanup = () => {
                        void watcher.close();
                        if (timer) {
                            clearTimeout(timer);
                        }
                        resolve();
                    };
                    process.once('SIGINT', cleanup);
                    process.once('SIGTERM', cleanup);
                });
            });
        },
    });
}

async function collectWatchRoots(resolved: ResolvedTargets): Promise<string[]> {
    const candidates = new Set<string>();

    for (const target of resolved.targets) {
        for (const root of entryPointRoots(target.metadata.entryPoint, resolved.cwd)) {
            candidates.add(root);
        }
    }
    if (resolved.configPath) {
        candidates.add(path.dirname(resolved.configPath));
    }

    const valid: string[] = [];
    for (const candidate of candidates) {
        try {
            const stat = await fsp.stat(candidate);
            if (stat.isDirectory()) {
                valid.push(candidate);
            }
        } catch {
            // missing — skip
        }
    }

    if (valid.length === 0) {
        valid.push(resolved.cwd);
    }
    return valid;
}

function entryPointRoots(entryPoint: EntryPoint, cwd: string): string[] {
    const roots: string[] = [];
    const visit = (value: string | EntryPointOptions, baseCwd: string) => {
        if (typeof value === 'string') {
            roots.push(globRoot(value, baseCwd));
            return;
        }
        roots.push(globRoot(value.pattern, value.cwd ?? baseCwd));
    };

    if (Array.isArray(entryPoint)) {
        for (const item of entryPoint) {
            visit(item, cwd);
        }
    } else {
        visit(entryPoint, cwd);
    }
    return roots;
}

// Strip the trailing glob portion of a pattern so chokidar can watch the
// largest concrete directory (e.g. `src/api/**/*.ts` → `<cwd>/src/api`).
function globRoot(pattern: string, cwd: string): string {
    const meta = pattern.search(/[*?{[]/);
    const staticPrefix = meta === -1 ? pattern : pattern.slice(0, meta);
    const dir = meta === -1 ? path.dirname(staticPrefix) : staticPrefix;
    const trimmed = dir.replace(/[\\/]+$/, '');
    return path.isAbsolute(trimmed) ? trimmed : path.resolve(cwd, trimmed || '.');
}
