/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildLoaderFilePath, locateManySync } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import { buildCacheOptions, buildFileHash } from './utils';
import type { CacheData, CacheOptions, CacheOptionsInput } from './type';

export class CacheDriver {
    private readonly options: CacheOptions;

    constructor(config: string | boolean | CacheOptionsInput) {
        this.options = buildCacheOptions(config);
    }

    // -------------------------------------------------------------------------

    public save(data: CacheData): string | undefined {
        if (!this.options.enabled) {
            return undefined;
        }

        const filePath: string = this.buildFilePath(undefined, data.sourceFilesSize);

        fs.writeFileSync(filePath, JSON.stringify(data));

        return filePath;
    }

    public get(sourceFilesSize: number): CacheData | undefined {
        if (!this.options.enabled) {
            return undefined;
        }

        this.clear();

        const filePath: string = this.buildFilePath(undefined, sourceFilesSize);

        try {
            const buffer: Buffer = fs.readFileSync(filePath);

            const content: string = buffer.toString('utf-8');

            // todo: maybe add shape validation here :)
            const cache: CacheData | undefined = JSON.parse(content) as CacheData;

            if (typeof cache === 'undefined' || cache.sourceFilesSize !== sourceFilesSize) {
                return undefined;
            }

            return cache;
        } catch (e) {
            /* istanbul ignore next */
            return undefined;
        }
    }

    // -------------------------------------------------------------------------

    /**
     * At a 10% chance, clear all cache files :)
     */

    /* istanbul ignore next */
    public clear(): void {
        if (!this.options.enabled || !this.options.clearAtRandom) {
            return;
        }

        const rand: number = Math.floor(Math.random() * 100) + 1;
        if (rand > 10) {
            return;
        }

        const files = locateManySync(this.buildFileName('**'), {
            path: this.options.directoryPath,
        });

        files.map((file) => fs.unlinkSync(buildLoaderFilePath(file, true)));
    }

    // -------------------------------------------------------------------------

    private buildFilePath(hash?: string, sourceFilesSize?: number): string {
        return path.join(this.options.directoryPath, this.buildFileName(hash, sourceFilesSize));
    }

    private buildFileName(hash?: string, sourceFilesSize?: number): string {
        if (typeof this.options.fileName === 'string') {
            return this.options.fileName;
        }
        return `.swagger-${hash ?? buildFileHash(sourceFilesSize)}.json`;
    }
}
