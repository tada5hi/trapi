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
import type { CacheOptions, CacheOptionsInput } from './type';

export function buildCacheOptions(input?: string | boolean | CacheOptionsInput) : CacheOptions {
    if (typeof input === 'string') {
        input = {
            enabled: true,
            directoryPath: input,
        };
    }

    if (typeof input === 'boolean') {
        input = {
            enabled: input,
        };
    }

    input = input || {};

    /* istanbul ignore next */
    const isTestEnvironment : boolean = !!process.env.NODE_ENV && process.env.NODE_ENV === 'test';

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
        clearAtRandom: input.clearAtRandom ?? !isTestEnvironment,
    };
}

export function generateFileHash(sourceFilesSize?: number): string {
    const hash = crypto.createHash('sha256');

    const strSize: string = (sourceFilesSize ?? 0).toString();

    hash.update(strSize);

    return hash.digest('hex');
}
