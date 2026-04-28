/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Bump whenever the on-disk cache shape changes incompatibly
 * (Metadata, Controller, Method, Parameter, resolver type nodes,
 * or the cache wrapper itself). Old cache files with a different
 * version are rejected on read.
 */
export const CACHE_SCHEMA_VERSION = '3';

export const CACHE_FILE_PREFIX = '.trapi-metadata-';
export const CACHE_FILE_SUFFIX = '.json';

/** 7 days. */
export const CACHE_DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
