/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import crypto from 'crypto';
import { Cache } from './type';

export function buildCacheConfig(config?: string | boolean | Partial<Cache.Config>) : Cache.Config {
    if (typeof config === 'string') {
        config = {
            enabled: true,
            directoryPath: config,
        };
    }

    if (typeof config === 'boolean') {
        config = {
            enabled: config,
        };
    }

    config ??= {};

    /* istanbul ignore next */
    const isTestEnvironment : boolean = !!process.env.NODE_ENV && process.env.NODE_ENV === 'test';

    return {
        fileName: config.fileName,
        directoryPath: typeof config.directoryPath === 'string' ?
            path.isAbsolute(config.directoryPath) ? config.directoryPath : path.join(process.cwd(), config.directoryPath) :
            process.cwd(),
        enabled: config.enabled ?? false,
        clearAtRandom: config.clearAtRandom ?? !isTestEnvironment,
    };
}

export function buildFileHash(sourceFilesSize?: number): string {
    const hash = crypto.createHash('sha256');

    const strSize: string = (sourceFilesSize ?? 0).toString();

    hash.update(strSize);

    return hash.digest('hex');
}
