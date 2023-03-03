/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    IsDouble,
    IsFloat,
    IsInt,
    IsLong,
    Options as MetadataConfig,
    MetadataGeneratorOutput,
    RequestConsumes,
    RequestFileParam,
    ResponseDescription,
    ResponseExample,
    ResponseProduces,
    SwaggerDeprecated,

    SwaggerHidden,
    SwaggerTags,
    createMetadataGenerator,
    generateMetadata,
} from '@trapi/metadata';

import type { CacheOptions } from '@trapi/metadata';

type MetadataCacheConfig = CacheOptions;

export {
    // Utils
    generateMetadata,
    createMetadataGenerator,

    // Types & Interfaces
    MetadataGeneratorOutput,
    MetadataCacheConfig,
    MetadataConfig,

    // Internal Decorators
    RequestConsumes,
    RequestFileParam,
    ResponseDescription,
    ResponseExample,
    ResponseProduces,
    SwaggerTags,
    SwaggerHidden,
    SwaggerDeprecated,
    IsDouble,
    IsFloat,
    IsLong,
    IsInt,
};
