/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MetadataGeneratorOutput } from '../generator';

export interface CacheOptions {
    /**
     * Specify if the cache driver should be enabled.
     *
     * Default: false
     * */
    enabled: boolean,
    /**
     * Directory relative or absolute path.
     *
     * Default: tmpDir()
     */
    directoryPath: string,
    /**
     * Specify the cache file name.
     *
     * Default: metadata-{hash}.json
     */
    fileName?: string,

    /**
     * The cache file(s) will be cleared at a 10% percent change
     * each time.
     *
     * Default: true
     */
    clearAtRandom: boolean
}

export type CacheOptionsInput = Partial<CacheOptions>;

export type CacheData = {
    sourceFilesSize: number;
} & MetadataGeneratorOutput;
