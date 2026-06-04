/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { parse as parseFlatted, stringify as stringifyFlatted } from 'flatted';
import { buildFilePath as joinFilePath, locateMany } from 'locter';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
    CACHE_FILE_PREFIX,
    CACHE_FILE_SUFFIX,
    CACHE_SCHEMA_VERSION,
} from './constants';
import { buildCacheOptions } from './utils';
import type {
    CacheData,
    CacheOptions,
    CacheOptionsInput,
    ICacheClient,
} from './types';

export class CacheClient implements ICacheClient {
    private readonly options: CacheOptions;

    constructor(input?: string | boolean | CacheOptionsInput) {
        this.options = buildCacheOptions(input);
    }

    // -------------------------------------------------------------------------

    async save(data: CacheData): Promise<string | undefined> {
        if (!this.options.enabled) {
            return undefined;
        }

        await this.ensureDirectory();

        const filePath = this.resolveFilePath(data.cacheKey);
        // `flatted` is cycle-safe — it encodes self-references and back-edges
        // as integer indices into a flat array. Well-formed metadata uses
        // `refName` strings for cross-references and contains no cycles, but
        // we use `flatted` defensively so a future regression cannot crash
        // serialization or silently corrupt the cached graph.
        const payload = stringifyFlatted(data);

        // Atomic write: rename is atomic on POSIX, so concurrent generators
        // either see the previous file or the new one — never a half-written
        // truncation.
        const tmpPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;

        try {
            await fs.promises.writeFile(tmpPath, payload);
            await fs.promises.rename(tmpPath, filePath);
        } catch (err) {
            // Best-effort cleanup of the temp file if rename failed.
            try {
                await fs.promises.unlink(tmpPath);
            } catch {
                // ignore
            }
            throw err;
        }

        // Opportunistic eviction. Errors are ignored — eviction is a
        // housekeeping concern, not a correctness one.
        this.evict().catch((): void => undefined);

        return filePath;
    }

    async get(cacheKey: string): Promise<CacheData | undefined> {
        if (!this.options.enabled) {
            return undefined;
        }

        const filePath = this.resolveFilePath(cacheKey);

        let content: string;
        try {
            content = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
        } catch {
            return undefined;
        }

        let cache: CacheData;
        try {
            cache = parseFlatted(content) as CacheData;
        } catch {
            // Corrupt file — drop it so the next save can replace cleanly.
            await fs.promises.unlink(filePath).catch((): void => undefined);
            return undefined;
        }

        if (
            !cache ||
            cache.cacheKey !== cacheKey ||
            cache.schemaVersion !== CACHE_SCHEMA_VERSION
        ) {
            return undefined;
        }

        return cache;
    }

    // -------------------------------------------------------------------------

    /**
     * Prune cache files older than `maxAgeMs`. No-op when disabled or when
     * `maxAgeMs <= 0`. Each unlink is best-effort — a concurrent generator
     * may have already removed the file.
     */
    async evict(): Promise<void> {
        if (!this.options.enabled || this.options.maxAgeMs <= 0) {
            return;
        }

        const pattern = this.options.fileName ?? `${CACHE_FILE_PREFIX}*${CACHE_FILE_SUFFIX}`;

        let entries: Awaited<ReturnType<typeof locateMany>>;
        try {
            entries = await locateMany(pattern, { cwd: this.options.directoryPath });
        } catch {
            return;
        }

        const cutoff = Date.now() - this.options.maxAgeMs;

        await Promise.all(entries.map(async (entry) => {
            const filePath = joinFilePath(entry);
            try {
                const stat = await fs.promises.stat(filePath);
                if (stat.mtimeMs < cutoff) {
                    await fs.promises.unlink(filePath);
                }
            } catch {
                // ignore — file may have been removed by another process
            }
        }));
    }

    // -------------------------------------------------------------------------

    private resolveFilePath(cacheKey: string): string {
        // The internal pipeline always passes a sha256 hex digest, but the
        // public `ICacheClient` accepts any string. Reject anything that
        // could break out of `directoryPath` via `path.join`'s normalization
        // (`../`, absolute paths, embedded separators, NUL bytes).
        if (!CACHE_KEY_PATTERN.test(cacheKey)) {
            throw new Error(`Invalid cacheKey: must match ${CACHE_KEY_PATTERN}`);
        }
        const fileName = this.options.fileName ??
            `${CACHE_FILE_PREFIX}${cacheKey}${CACHE_FILE_SUFFIX}`;
        return path.join(this.options.directoryPath, fileName);
    }

    private async ensureDirectory(): Promise<void> {
        // Don't memoize — the directory may be removed externally (temp
        // cleanup, another process) at any time. `mkdir(recursive: true)`
        // is a no-op when the directory already exists, so re-running it
        // on every save is cheap and self-healing.
        await fs.promises.mkdir(this.options.directoryPath, { recursive: true });
    }
}

// Hex digest from sha256 (64 chars) is the canonical caller, but allow
// any printable ASCII without separators / dots up to a sane length so
// custom callers (and the suffix-bearing tmp path) keep working.
const CACHE_KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
