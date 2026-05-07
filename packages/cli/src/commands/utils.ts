/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import { DocumentFormat, Version } from '@trapi/swagger';
import { CLIUserError } from '../logger.ts';

export const VERSION_VALUES = Object.values(Version);
export const FORMAT_VALUES = Object.values(DocumentFormat);

export function normalizeVersion(input: string): `${Version}` {
    const value = input.startsWith('v') ? input : `v${input}`;
    if (!(VERSION_VALUES as string[]).includes(value)) {
        throw new CLIUserError(
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

/**
 * Split an absolute output file path into the `(cwd, name, format)` triple
 * that `saveSwagger` consumes. Format precedence: explicit override → file
 * extension → JSON default.
 */
export function splitOutputPath(
    absolutePath: string,
    formatOverride?: string,
): ResolvedOutput {
    if (!path.isAbsolute(absolutePath)) {
        throw new CLIUserError(`splitOutputPath requires an absolute path, got "${absolutePath}".`);
    }

    const format = ((): `${DocumentFormat}` => {
        if (formatOverride) {
            if (!(FORMAT_VALUES as string[]).includes(formatOverride)) {
                throw new CLIUserError(
                    `Unknown output format "${formatOverride}". Supported: ${FORMAT_VALUES.join(', ')}.`,
                );
            }
            return formatOverride as `${DocumentFormat}`;
        }
        return detectFormatFromPath(absolutePath) ?? DocumentFormat.JSON;
    })();

    const ext = path.extname(absolutePath);
    const baseName = path.basename(absolutePath, ext);

    return {
        cwd: path.dirname(absolutePath),
        name: baseName,
        format,
    };
}

export function resolveOutput(
    output: string | undefined,
    formatArg: string | undefined,
): ResolvedOutput {
    const fallback = output ?? 'swagger.json';
    const absolute = path.isAbsolute(fallback) ?
        fallback :
        path.join(process.cwd(), fallback);

    return splitOutputPath(absolute, formatArg);
}

export function splitCsv(input: string | undefined): string[] | undefined {
    if (input === undefined) {
        return undefined;
    }
    const parts = input
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    return parts.length > 0 ? parts : undefined;
}

export function parseStrict(input: string | undefined): boolean | 'throw' | undefined {
    if (input === undefined) {
        return undefined;
    }
    if (input === 'throw') {
        return 'throw';
    }
    if (input === 'true' || input === '') {
        return true;
    }
    if (input === 'false') {
        return false;
    }
    throw new CLIUserError(`Unknown --strict value "${input}". Use "true", "false", or "throw".`);
}

export function parseSecurityDefinitions(input: string | undefined): Record<string, unknown> | undefined {
    if (!input) {
        return undefined;
    }
    try {
        const value = JSON.parse(input) as unknown;
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('expected a JSON object');
        }
        return value as Record<string, unknown>;
    } catch (err) {
        throw new CLIUserError(
            `Failed to parse --security-definitions JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
    }
}
