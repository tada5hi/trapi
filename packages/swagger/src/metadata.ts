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
    RequestConsumes,
    RequestFileParam,
    ResponseDescription,
    ResponseExample,
    ResponseProduces,
    SwaggerDeprecated,
    SwaggerHidden,
    SwaggerTags,
} from '@trapi/decorators';

import {
    Cache as MetadataCache,
    Config as MetadataConfig,
    GeneratorOutput as MetadataGeneratorOutput,
    createMetadataGenerator,
    generateMetadata,
} from '@trapi/metadata';

type MetadataCacheConfig = MetadataCache.Config;

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
