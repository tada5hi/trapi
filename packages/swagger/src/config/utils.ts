/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import type { Options, OptionsInput, ServerOption } from './type';

export function buildOptions(input: OptionsInput) : Options {
    const servers : ServerOption[] = [];
    if (input.servers) {
        if (Array.isArray(input.servers)) {
            for (let i = 0; i < input.servers.length; i++) {
                const server = input.servers[i];
                if (typeof server === 'string') {
                    servers.push({ url: server });
                } else {
                    servers.push(server);
                }
            }
        } else if (typeof input.servers === 'string') {
            servers.push({ url: input.servers });
        } else {
            servers.push(input.servers);
        }
    }

    let outputDirectory : string;
    if (input.outputDirectory) {
        outputDirectory = path.isAbsolute(input.outputDirectory) ?
            input.outputDirectory :
            path.join(process.cwd(), input.outputDirectory);
    } else {
        outputDirectory = process.cwd();
    }

    return {
        ...input,
        output: input.output ?? true,
        outputDirectory,
        outputFileName: input.outputFileName || 'swagger',
        servers,
    };
}
