/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Metadata } from '../../core/types/metadata';

export interface CacheOptions {
    /**
     * Specify if the cache driver should be enabled.
     *
     * Default: false
     * */
    enabled: boolean,
    /**
     * Directory relative or absolute path. Auto-created on first save.
     *
     * Default: tmpDir()
     */
    directoryPath: string,
    /**
     * Specify the cache file name. When set, the cache becomes a single-slot
     * store at this exact name (instead of one file per cache key). The
     * in-file `cacheKey` check still rejects mismatches; you just lose
     * multi-key caching.
     *
     * Default: .trapi-metadata-{cacheKey}.json
     */
    fileName?: string,

    /**
     * Files older than this many milliseconds are pruned opportunistically
     * after each successful save. Set to `0` to disable eviction.
     *
     * Default: 7 days
     */
    maxAgeMs: number,
}

export type CacheOptionsInput = Partial<CacheOptions>;

export type CacheData = {
    /**
     * Opaque composite key — sha256 over (schema version, source files content,
     * compiler options, resolved registry shape, preset name). The reader
     * cross-checks this against the expected key to defend against collisions
     * or schema drift.
     */
    cacheKey: string;
    /** Stamped at write time; rejected on read if not equal to the current value. */
    schemaVersion: string;
} & Metadata;

export interface ICacheClient {
    save(data: CacheData): Promise<string | undefined>;
    get(cacheKey: string): Promise<CacheData | undefined>;
    /** Prune cache files older than `maxAgeMs`. Safe to call concurrently. */
    evict(): Promise<void>;
}
