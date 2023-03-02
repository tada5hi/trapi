/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GeneratorOutput } from '../type';

export namespace Cache {
    export interface Config {
        /**
         * Specify if the cache driver should be enabled.
         *
         * Default: false
         * */
        enabled: boolean,
        /**
         * Directory relative or absolute path.
         *
         * Default: process.cwd()
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

    export type Data = {
        sourceFilesSize: number;
    } & GeneratorOutput;
}
