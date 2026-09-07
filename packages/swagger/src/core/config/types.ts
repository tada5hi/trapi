/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionFormat, Metadata } from '@trapi/core';
import type { DocumentFormat, OperationIdStrategy, Version } from '../constants';
import type { SecurityDefinitions } from '../types';

export type ServerOption = {
    url: string,
    description?: string,
};

export type SpecGeneratorOptions = {
    /**
     * API host, e.g. localhost:3000 or https://myapi.com
     */
    servers?: ServerOption[];

    /**
     * API version number; defaults to npm package version
     */
    version?: string;

    /**
     * API name; defaults to npm package name
     */
    name?: string;

    /**
     * 'API description; defaults to npm package description
     */
    description?: string;

    /**
     * API license; defaults to npm package license
     */
    license?: string;

    /**
     * Extend generated swagger spec with this object
     * Note that generated properties will always take precedence over what get specified here
     */
    specificationExtra?: Record<string, any>;

    /**
     * Security Definitions Object
     * A declaration of the security schemes available to be used in the
     * specification. This does not enforce the security schemes on the operations
     * and only serves to provide the relevant details for each scheme.
     */
    securityDefinitions?: SecurityDefinitions;

    /**
     * Default consumes property for the entire API
     */
    consumes?: string[];

    /**
     * Default produces property for the entire API
     */
    produces?: string[];

    /**
     * Default collectionFormat property for query parameters of array type.
     * Possible values are `csv`, `ssv`, `tsv`, `pipes`, `multi`. If not specified, Swagger defaults to `csv`.
     */
    collectionFormat?: `${CollectionFormat}`;

    /**
     * How a default operationId is derived. `method` uses Ucfirst(methodName),
     * `path` uses the HTTP verb plus the emitted URL segments. An explicit
     * `operationId` always wins over both.
     *
     * `path` ids are stable under controller reordering, except where two paths
     * normalise to the same id (`/users/{id}` and `/users/by-id` both yield
     * `getUsersById`) — the loser still gets an emission-order `_2` suffix.
     *
     * default: OperationIdStrategy.METHOD
     */
    operationIdStrategy?: `${OperationIdStrategy}`;
};

export type SpecGeneratorOptionsInput = Omit<Partial<SpecGeneratorOptions>, 'servers'> & {
    servers?: string | string[] | ServerOption | ServerOption[]
};

export type SwaggerSaveOptions = {
    /**
     * Working directory the output file is written to. Relative paths are resolved against it.
     *
     * default: process.cwd()
     */
    cwd?: string;

    /**
     * File format to emit.
     *
     * default: DocumentFormat.JSON
     */
    format?: `${DocumentFormat}`;

    /**
     * File name, with or without extension. Any `.json` / `.yaml` suffix is stripped
     * and replaced to match `format`.
     *
     * default: 'swagger'
     */
    name?: string;
};

export type SwaggerGenerateData = {
    /**
     * API name; defaults to npm package name.
     */
    name?: string;

    /**
     * API version; defaults to npm package version.
     */
    version?: string;

    /**
     * API description; defaults to npm package description.
     */
    description?: string;

    /**
     * API license; defaults to npm package license.
     */
    license?: string;

    /**
     * API servers.
     */
    servers?: string | string[] | ServerOption | ServerOption[];

    /**
     * Security scheme definitions.
     */
    securityDefinitions?: SecurityDefinitions;

    /**
     * Default consumes content types.
     */
    consumes?: string[];

    /**
     * Default produces content types.
     */
    produces?: string[];

    /**
     * Default collection format for array query parameters.
     */
    collectionFormat?: `${CollectionFormat}`;

    /**
     * How a default operationId is derived ('method' or 'path').
     *
     * default: 'method'
     */
    operationIdStrategy?: `${OperationIdStrategy}`;

    /**
     * Extra properties to merge into the generated spec.
     */
    extra?: Record<string, any>;
};

export type SwaggerGenerateOptions = {
    /**
     * Swagger/OpenAPI spec version to generate (e.g. 'v2', 'v3').
     */
    version: `${Version}`;

    /**
     * Pre-built metadata. Produce it with `generateMetadata` from `@trapi/metadata`,
     * or supply your own `Metadata`-shaped value (e.g. read from a JSON fixture or
     * an alternate extractor) — `@trapi/swagger` does not depend on the TypeScript
     * compiler.
     */
    metadata: Metadata;

    /**
     * Document content (info, servers, security, etc.).
     */
    data?: SwaggerGenerateData;
};
