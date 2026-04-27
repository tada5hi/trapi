/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import type { CompilerOptions } from 'typescript';
import type { Registry } from '../decorator/types';
import { CACHE_DEFAULT_MAX_AGE_MS } from './constants';
import type { CacheOptions, CacheOptionsInput } from './types';

export function buildCacheOptions(input?: string | boolean | CacheOptionsInput) : CacheOptions {
    if (typeof input === 'string') {
        input = {
            enabled: true,
            directoryPath: input,
        };
    }

    if (typeof input === 'boolean') {
        input = { enabled: input };
    }

    input = input || {};

    let directoryPath = tmpdir();
    if (typeof input.directoryPath === 'string') {
        directoryPath = path.isAbsolute(input.directoryPath) ?
            input.directoryPath :
            path.join(process.cwd(), input.directoryPath);
    }

    return {
        fileName: input.fileName,
        directoryPath,
        enabled: input.enabled ?? true,
        maxAgeMs: input.maxAgeMs ?? CACHE_DEFAULT_MAX_AGE_MS,
    };
}

// -----------------------------------------------------------------------------
// Cache key composition
// -----------------------------------------------------------------------------

export type CacheKeyParts = {
    schemaVersion: string;
    sourceFilesHash: string;
    compilerOptionsHash: string;
    registryHash: string;
    presetName?: string;
};

/**
 * Combines all key contributors into a single sha256 hex string. The order is
 * stable; each part is null-separated to avoid concatenation ambiguity.
 */
export function composeCacheKey(parts: CacheKeyParts): string {
    const hash = crypto.createHash('sha256');
    hash.update(parts.schemaVersion);
    hash.update('\0');
    hash.update(parts.sourceFilesHash);
    hash.update('\0');
    hash.update(parts.compilerOptionsHash);
    hash.update('\0');
    hash.update(parts.registryHash);
    hash.update('\0');
    hash.update(parts.presetName ?? '');
    return hash.digest('hex');
}

/**
 * Hash a stable JSON projection of `compilerOptions`. Sorting keys keeps the
 * output deterministic regardless of declaration order in tsconfig.json.
 */
export function hashCompilerOptions(options?: CompilerOptions): string {
    const hash = crypto.createHash('sha256');
    hash.update(stableStringify(options ?? {}));
    return hash.digest('hex');
}

/**
 * Hash the resolved registry's structural shape. Catches structural changes
 * (handler added/removed/renamed, marker changed, replaces policy changed)
 * AND most logic changes via `apply.toString()`. Misses changes that are
 * purely captured-variable shifts in factory-built handlers — acceptable
 * trade-off for catching local preset edits.
 */
export function hashRegistry(registry: Registry): string {
    const hash = crypto.createHash('sha256');
    const kinds = [
        'controllers',
        'methods',
        'parameters',
        'controllerJsDoc',
        'methodJsDoc',
        'parameterJsDoc',
    ] as const;
    for (const kind of kinds) {
        hash.update(kind);
        hash.update('\0');
        const handlers = registry[kind] ?? [];
        for (const handler of handlers) {
            hash.update(stableStringify(handler.match));
            hash.update('\0');
            hash.update(stableStringify(handler.marker ?? null));
            hash.update('\0');
            hash.update(String(handler.replaces ?? ''));
            hash.update('\0');
            hash.update(handler.apply.toString());
            hash.update('\0');
        }
        hash.update('\x01');
    }
    return hash.digest('hex');
}

/**
 * JSON.stringify with sorted object keys at every level. Functions and
 * undefined are omitted as usual; that's fine for the inputs we hash here.
 */
function stableStringify(value: unknown): string {
    return JSON.stringify(value, (_key, val) => {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            const sorted: Record<string, unknown> = {};
            for (const k of Object.keys(val as Record<string, unknown>).sort()) {
                sorted[k] = (val as Record<string, unknown>)[k];
            }
            return sorted;
        }
        return val;
    });
}
