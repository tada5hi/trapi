/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildFilePath, isObject, locateMany } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import { buildCacheOptions, generateFileHash } from './utils';
import type { CacheData, CacheOptions, CacheOptionsInput } from './type';

export class CacheClient {
    private readonly options: CacheOptions;

    constructor(input?: string | boolean | CacheOptionsInput) {
        this.options = buildCacheOptions(input);
    }

    // -------------------------------------------------------------------------

    async save(data: CacheData): Promise<string | undefined> {
        if (!this.options.enabled) {
            return undefined;
        }

        const filePath = this.buildFilePath(undefined, data.sourceFilesSize);

        await fs.promises.writeFile(filePath, this.serialize(data));

        return filePath;
    }

    async get(sourceFilesSize: number): Promise<CacheData | undefined> {
        if (!this.options.enabled) {
            return undefined;
        }

        await this.clear();

        const filePath: string = this.buildFilePath(undefined, sourceFilesSize);

        try {
            const content = await fs.promises.readFile(filePath, { encoding: 'utf-8' });

            // todo: maybe add shape validation here :)
            const cache: CacheData | undefined = JSON.parse(content) as CacheData;

            if (!cache || cache.sourceFilesSize !== sourceFilesSize) {
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
    async clear(): Promise<void> {
        if (!this.options.enabled || !this.options.clearAtRandom) {
            return;
        }

        const rand: number = Math.floor(Math.random() * 100) + 1;
        if (rand > 10) {
            return;
        }

        const files = await locateMany(this.buildFileName('**'), {
            path: this.options.directoryPath,
        });

        const unlinkPromises : Promise<void>[] = [];
        for (let i = 0; i < files.length; i++) {
            unlinkPromises.push(fs.promises.unlink(buildFilePath(files[i])));
        }

        await Promise.all(unlinkPromises);
    }

    // -------------------------------------------------------------------------

    private buildFilePath(hash?: string, sourceFilesSize?: number): string {
        return path.join(this.options.directoryPath, this.buildFileName(hash, sourceFilesSize));
    }

    private buildFileName(hash?: string, sourceFilesSize?: number): string {
        if (typeof this.options.fileName === 'string') {
            return this.options.fileName;
        }
        return `.swagger-${hash ?? generateFileHash(sourceFilesSize)}.json`;
    }

    protected serialize(input: unknown) : string {
        let cache = [];
        const str = JSON.stringify(input, (key, value) => {
            if (isObject(value) || Array.isArray(value)) {
                if (cache.indexOf(value) !== -1) {
                    return undefined;
                }

                cache.push(value);
            }

            return value;
        });

        cache = undefined;
        return str;
    }
}
