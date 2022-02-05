/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'fs';
import * as glob from 'glob';
import path from 'path';
import { buildCacheConfig, buildFileHash } from './utils';
import { Cache } from './type';

export class CacheDriver {
    private readonly config: Cache.Config;

    constructor(config: string | boolean | Partial<Cache.Config>) {
        this.config = buildCacheConfig(config);
    }

    // -------------------------------------------------------------------------

    public save(data: Cache.Data): string | undefined {
        if (!this.config.enabled) {
            return undefined;
        }

        const filePath: string = this.buildFilePath(undefined, data.sourceFilesSize);

        fs.writeFileSync(filePath, JSON.stringify(data));

        return filePath;
    }

    public get(sourceFilesSize: number): Cache.Data | undefined {
        if (!this.config.enabled) {
            return undefined;
        }

        this.clear();

        const filePath: string = this.buildFilePath(undefined, sourceFilesSize);

        try {
            const buffer: Buffer = fs.readFileSync(filePath);

            const content: string = buffer.toString('utf-8');

            // todo: maybe add shape validation here :)
            const cache: Cache.Data | undefined = JSON.parse(content) as Cache.Data;

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
        if (!this.config.enabled || !this.config.clearAtRandom) {
            return;
        }

        const rand: number = Math.floor(Math.random() * 100) + 1;
        if (rand > 10) {
            return;
        }

        const files: string[] = glob.sync(this.buildFilePath('**'));
        files.map((file) => fs.unlinkSync(file));
    }

    // -------------------------------------------------------------------------

    private buildFilePath(hash?: string, sourceFilesSize?: number): string {
        return path.join(this.config.directoryPath, this.buildFileName(hash, sourceFilesSize));
    }

    private buildFileName(hash?: string, sourceFilesSize?: number): string {
        if (typeof this.config.fileName === 'string') {
            return this.config.fileName;
        }
        return `.swagger-${hash ?? buildFileHash(sourceFilesSize)}.json`;
    }
}
