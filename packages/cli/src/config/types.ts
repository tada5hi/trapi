/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MetadataGenerateOptions } from '@trapi/metadata';
import type {
    DocumentFormat,
    SwaggerGenerateData,
    Version,
} from '@trapi/swagger';

export type TrapiOutputConfig = {
    path?: string;
    format?: `${DocumentFormat}`;
};

/**
 * Post-process the generated OpenAPI document before it is written.
 *
 * Runs after `generateSwagger` and before the output file is written, so it
 * sees the finished document — including the paths and operationIds the
 * emitter assigned, which `swagger.data.extra` cannot know because that merge
 * input is built before generation.
 *
 * Mutate `spec` in place and return nothing, or return a replacement document.
 *
 * Throwing aborts the run: no file is written for this entry and
 * `trapi generate` exits non-zero.
 *
 * Only reachable from a JS/TS config file — a JSON config (or the `trapi`
 * field in `package.json`) cannot carry a function.
 */
export type SwaggerTransform = (
    spec: Record<string, any>,
) => Record<string, any> | void | Promise<Record<string, any> | void>;

export type TrapiConfigEntry = {
    /**
     * Working directory relative paths in this entry are resolved against.
     * Defaults to the directory of the config file (or `process.cwd()` when
     * no config file was loaded).
     */
    cwd?: string;

    /**
     * Metadata extraction options forwarded to `generateMetadata`.
     */
    metadata?: Partial<MetadataGenerateOptions>;

    /**
     * Swagger / OpenAPI generation options.
     */
    swagger?: {
        version?: `${Version}`;
        data?: SwaggerGenerateData;
        transform?: SwaggerTransform;
    };

    /**
     * Output file path + format. The extension on `output.path` picks the
     * format unless `output.format` is set explicitly.
     */
    output?: TrapiOutputConfig;
};

export type TrapiConfig = TrapiConfigEntry | TrapiConfigEntry[];

export type LoadedConfig = {
    /** Absolute path the config was loaded from, or `undefined` when none was found. */
    path?: string;
    /** Always normalised to an array. Empty when no config and no entries. */
    entries: TrapiConfigEntry[];
};
