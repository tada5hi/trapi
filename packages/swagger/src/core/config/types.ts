/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionFormat, Metadata, Response } from '@trapi/core';
import type { DocumentFormat, OperationIdStrategy, Version } from '../constants';
import type { SecurityDefinitions } from '../types';

export type ServerOption = {
    url: string,
    description?: string,
};

export type PathParameterOption = {
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
     * Responses merged into every emitted operation, ahead of the operation's
     * own. OpenAPI has no document-level `responses`, so a spec-wide error shape
     * can otherwise only be repeated on every method, or patched onto the
     * finished document — which cannot know which paths exist.
     *
     * A method's own response wins on a colliding `status`: both emitters key
     * the operation's response record by status and the later write survives.
     *
     * These are `@trapi/core` `Response` objects rather than raw OpenAPI
     * fragments, so one config emits the right shape for every version — a V2
     * `schema` ref and a V3 `content` entry come out of the same input.
     */
    responses?: Response[];

    /**
     * Documentation for path-template variables, keyed by variable name.
     *
     * A variable the emitter synthesizes — one the path template declares but no
     * decorated argument does — has no declaration to read a description from,
     * and it appears on every verb of the mount, so no per-method handler covers
     * it either. Path variable names are global in practice, so a document-wide
     * map is the level that matches.
     *
     * Also fills in for a *declared* path parameter that carries no description
     * of its own, so one entry reads the same on every operation the variable
     * appears in. A decorated description always wins.
     */
    pathParameters?: Record<string, PathParameterOption>;

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
     * Responses merged into every operation. A method's own response with the
     * same `status` wins.
     */
    responses?: Response[];

    /**
     * Descriptions for path-template variables, keyed by variable name. Covers
     * variables the emitter synthesizes and declared path parameters that have
     * no description of their own.
     */
    pathParameters?: Record<string, PathParameterOption>;

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
