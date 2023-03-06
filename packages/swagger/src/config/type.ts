/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionFormat, Options as MetadataOptions } from '@trapi/metadata';
import type { SpecificationVersion } from '../constants';
import type { SecurityDefinitions } from '../type';

export interface Options {
    /**
     * Support the output to be a yaml file
     */
    yaml?: boolean;

    /**
     * Generated swagger.{json|yaml} will output here
     */
    outputDirectory?: string;

    /**
     * Generated documentation base file name. Default: swagger
     */
    outputFileName?: string;

    /**
     * API host, expressTemplate.g. localhost:3000 or https://myapi.com
     */
    host?: string;

    /**
     * Metadata options.
     */
    metadata?: MetadataOptions,

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
     * Base API path; e.g. the 'v1' in https://myapi.com/v1
     */
    basePath?: string;

    /**
     * Inform if the generated spec will be in swagger 2.0 format or regarding the open api 3.0 specification.
     *
     * Default: V2
     */
    specification?: `${SpecificationVersion}`;

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
