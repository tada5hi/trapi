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
