/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CacheOptions } from '../../adapters/cache';
import type { DecoratorConfig } from '../types/decorator';
import type { TsConfig } from '../../adapters/filesystem/tsconfig';

export type EntryPointOptions = {
    cwd: string,
    pattern: string
};

export type EntryPoint = string | string[] | EntryPointOptions | EntryPointOptions[];

export interface MetadataGeneratorOptions {
    /**
     * The entry point to your API.
     */
    entryPoint: EntryPoint;

    /**
     * Directory to ignore during TypeScript files scan.
     * Default: []
     */
    ignore?: string[];

    /**
     * Directory to allow during TypeScript files scan.
     * Default: []
     */
    allow?: string[],

    /**
     * Directory to store and cache metadata cache files.
     * Default: false
     */
    cache?: string | boolean | Partial<CacheOptions>;

    /**
     * Manual decorator properties configuration.
     */
    decorators?: DecoratorConfig[],

    /**
     * Load a specific preset configuration.
     */
    preset?: string;
}

export type MetadataGenerateOptions = MetadataGeneratorOptions & {
    /**
     * Path to tsconfig.json or a TsConfig object.
     */
    tsconfig?: string | TsConfig;
};
