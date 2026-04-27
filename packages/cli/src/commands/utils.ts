/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import { DocumentFormat, Version } from '@trapi/swagger';

export const VERSION_VALUES = Object.values(Version);
export const FORMAT_VALUES = Object.values(DocumentFormat);

export function normalizeVersion(input: string): `${Version}` {
    const value = input.startsWith('v') ? input : `v${input}`;
    if (!(VERSION_VALUES as string[]).includes(value)) {
        throw new Error(
            `Unknown OpenAPI version "${input}". Supported: ${VERSION_VALUES.join(', ')}.`,
        );
    }
    return value as `${Version}`;
}

export function detectFormatFromPath(filePath: string): `${DocumentFormat}` | undefined {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
        return DocumentFormat.YAML;
    }
    if (ext === '.json') {
        return DocumentFormat.JSON;
    }
    return undefined;
}

export type ResolvedOutput = {
    cwd: string;
    name: string;
    format: `${DocumentFormat}`;
};

export function resolveOutput(
    output: string | undefined,
    formatArg: string | undefined,
): ResolvedOutput {
    const fallback = output ?? 'swagger.json';
    const absolute = path.isAbsolute(fallback) ?
        fallback :
        path.join(process.cwd(), fallback);

    const format = ((): `${DocumentFormat}` => {
        if (formatArg) {
            if (!(FORMAT_VALUES as string[]).includes(formatArg)) {
                throw new Error(
                    `Unknown output format "${formatArg}". Supported: ${FORMAT_VALUES.join(', ')}.`,
                );
            }
            return formatArg as `${DocumentFormat}`;
        }
        return detectFormatFromPath(absolute) ?? DocumentFormat.JSON;
    })();

    const ext = path.extname(absolute);
    const baseName = path.basename(absolute, ext);

    return {
        cwd: path.dirname(absolute),
        name: baseName,
        format,
    };
}
