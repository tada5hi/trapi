/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'fs';
import path from 'path';

const cachedFileContent : Record<string, Record<string, any>> = {};

export function loadPackageJson(workingDir: string) : Record<string, any> {
    const filePath = path.join(workingDir, 'package.json');

    if (Object.prototype.hasOwnProperty.call(cachedFileContent, filePath)) {
        return cachedFileContent[filePath];
    }

    const rawContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

    return JSON.parse(rawContent);
}

export function getPackageJsonStringValue(
    workingDir: string,
    key: string,
    defaultValue = '',
) : string {
    try {
        const record = loadPackageJson(workingDir);

        return record[key] || defaultValue;
    } catch (e) {
        return defaultValue;
    }
}
