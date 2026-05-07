/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import type { MetadataGenerateOptions } from '@trapi/metadata';
import type {
    DocumentFormat,
    ServerOption,
    SwaggerGenerateData,
    Version,
} from '@trapi/swagger';
import { CLIUserError } from '../logger.ts';
import type { TrapiConfigEntry } from './types.ts';

export type GenerateFlags = {
    cwd?: string;
    entryPoint?: string | string[];
    preset?: string;
    tsconfig?: string;
    ignore?: string[];
    allow?: string[];
    strict?: boolean | 'throw';
    cache?: boolean;
    output?: string;
    format?: `${DocumentFormat}`;
    version?: `${Version}`;
    name?: string;
    apiVersion?: string;
    description?: string;
    servers?: string[];
    securityDefinitions?: SwaggerGenerateData['securityDefinitions'];
};

export type ResolvedTarget = {
    cwd: string;
    metadata: MetadataGenerateOptions;
    swagger: {
        version: `${Version}`;
        data: SwaggerGenerateData;
    };
    output: {
        path: string;
        format?: `${DocumentFormat}`;
    };
};

const DEFAULT_VERSION: `${Version}` = 'v3';

/**
 * Resolve a config entry against CLI flag overrides into the option bundles
 * passed to the metadata + swagger generators. CLI flags always win.
 */
export function resolveEntry(
    entry: TrapiConfigEntry,
    flags: GenerateFlags,
    fallbackCwd: string,
): ResolvedTarget {
    const cwd = flags.cwd ?? entry.cwd ?? fallbackCwd;

    const metadataConfig = entry.metadata ?? {};
    const swaggerConfig = entry.swagger ?? {};
    const outputConfig = entry.output ?? {};

    const entryPoint = flags.entryPoint ?? metadataConfig.entryPoint;
    if (entryPoint === undefined) {
        throw new CLIUserError(
            'No `entryPoint` provided. Set `metadata.entryPoint` in your config or pass `--entry-point`.',
        );
    }

    const metadata: MetadataGenerateOptions = {
        ...metadataConfig,
        entryPoint,
    };

    if (flags.preset !== undefined) {
        metadata.preset = flags.preset;
    }
    if (flags.tsconfig !== undefined) {
        metadata.tsconfig = flags.tsconfig;
    }
    if (flags.ignore !== undefined) {
        metadata.ignore = flags.ignore;
    }
    if (flags.allow !== undefined) {
        metadata.allow = flags.allow;
    }
    if (flags.strict !== undefined) {
        metadata.strict = flags.strict;
    }
    if (flags.cache !== undefined) {
        metadata.cache = flags.cache;
    }

    const data: SwaggerGenerateData = { ...(swaggerConfig.data ?? {}) };
    if (flags.name !== undefined) {
        data.name = flags.name;
    }
    if (flags.apiVersion !== undefined) {
        data.version = flags.apiVersion;
    }
    if (flags.description !== undefined) {
        data.description = flags.description;
    }
    if (flags.servers !== undefined) {
        data.servers = serversToOptions(flags.servers);
    }
    if (flags.securityDefinitions !== undefined) {
        data.securityDefinitions = flags.securityDefinitions;
    }

    const version = flags.version ?? swaggerConfig.version ?? DEFAULT_VERSION;

    const outputPath = flags.output ?? outputConfig.path ?? 'swagger.json';
    const outputFormat = flags.format ?? outputConfig.format;
    const absoluteOutput = path.isAbsolute(outputPath) ?
        outputPath :
        path.resolve(cwd, outputPath);

    return {
        cwd,
        metadata,
        swagger: { version, data },
        output: { path: absoluteOutput, format: outputFormat },
    };
}

function serversToOptions(input: string[]): ServerOption[] {
    return input.map((url) => ({ url }));
}
