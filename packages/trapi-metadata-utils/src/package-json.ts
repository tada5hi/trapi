/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as path from 'path';

let cachedFilePath : string | undefined;
let cachedFileContent : Record<string, any> | undefined;

export function getPackageJsonStringValue(workingDir: string, key: string, defaultValue = '') : string {
    const filePath = path.join(workingDir, 'package.json');

    try {
        if (
            typeof cachedFileContent === 'undefined' ||
            typeof cachedFilePath === 'undefined' ||
            cachedFilePath !== filePath
        ) {
            cachedFileContent = require(filePath);
        }

        cachedFilePath = filePath;

        return cachedFileContent[key] || defaultValue;
    } catch (e) {
        return defaultValue;
    }
}
