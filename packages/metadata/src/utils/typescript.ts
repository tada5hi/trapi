/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CompilerOptions, convertCompilerOptionsFromJson } from 'typescript';
import fs from 'fs';
import path from 'path';
import { hasOwnProperty } from '@trapi/common';

type CompilerOptionsContext = {
    cwd?: string,
    fileName?: string
};

export function getCompilerOptions(context?: CompilerOptionsContext): CompilerOptions {
    context ??= {};
    context.cwd ??= process.cwd();
    if (!path.isAbsolute(context.cwd)) {
        context.cwd = path.join(process.cwd(), context.cwd);
    }

    context.fileName ??= 'tsconfig.json';

    // get absolute file path
    const fullPath : string = path.join(context.cwd, context.fileName);

    // check permission to read file
    fs.accessSync(fullPath, fs.constants.R_OK);

    const raw : string = fs.readFileSync(fullPath, { encoding: 'utf-8' });

    const content : any = JSON.parse(raw);

    return hasOwnProperty(content, 'compilerOptions') ?
        convertCompilerOptionsFromJson(content.compilerOptions, context.cwd).options :
        {};
}
