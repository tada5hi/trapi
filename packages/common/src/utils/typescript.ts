/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CompilerOptions, convertCompilerOptionsFromJson } from 'typescript';
import fs from 'fs';
import path from 'path';
import { hasOwnProperty } from './object';

export function getCompilerOptions(
    filePath?: string,
    fileName = 'tsconfig.json',
): CompilerOptions {
    const cwd = process.cwd();

    // get absolute file path
    let fullPath : string = filePath ? path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath) : path.join(cwd, fileName);

    // check permission to read file
    fs.accessSync(fullPath, fs.constants.R_OK);

    const fileStats = fs.lstatSync(fullPath);

    fullPath = fileStats.isDirectory() ? path.join(fullPath, fileName) : fullPath;

    const raw : string = fs.readFileSync(fullPath, { encoding: 'utf-8' });

    const content : any = JSON.parse(raw);

    return hasOwnProperty(content, 'compilerOptions') ? convertCompilerOptionsFromJson(content.compilerOptions, cwd).options : {};
}
