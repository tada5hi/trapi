/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    CollectionFormat,
    Metadata,
    MetadataGenerateOptions,
    MetadataGeneratorOptions as MetadataOptions,
} from '@trapi/metadata';
import type { Version } from '../constants';
import type { SecurityDefinitions } from '../types';

export type ServerOption = {
    url: string,
    description?: string,
};

export interface Options {
    /**
     * Generate a yaml file
     */
    yaml?: boolean;

    /**
     * Specify if an output file should be generated.
     *
     * default: true
     */
    output: boolean,

    /**
     * Generated swagger.{json|yaml} will output here.
     *
     * default: process.cwd()
     */
    outputDirectory: string;

    /**
     * Generated documentation base file name.
     *
     * default: swagger
     */
    outputFileName: string;

    /**
     * API host, expressTemplate.g. localhost:3000 or https://myapi.com
     */
    servers?: ServerOption[];

    /**
     * Metadata options or metadata itself.
     */
    metadata?: MetadataOptions | Metadata,

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
}

export type OptionsInput = Omit<Partial<Options>, 'servers'> & {
    servers?: string | string[] | ServerOption | ServerOption[]
};

export type SwaggerGenerateOutput = {
    /**
     * Output directory for generated files.
     *
     * default: process.cwd()
     */
    directory?: string;

    /**
     * Base file name (without extension).
     *
     * default: 'swagger'
     */
    fileName?: string;

    /**
     * Also generate a YAML file.
     */
    yaml?: boolean;
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
     * Pre-built metadata or options to generate metadata from source.
     */
    metadata: MetadataGenerateOptions | Metadata;

    /**
     * Document content (info, servers, security, etc.).
     */
    data?: SwaggerGenerateData;
};
