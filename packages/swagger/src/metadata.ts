/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    // Utils
    generateMetadata,
    createMetadataGenerator,

    // Types & Interfaces
    GeneratorOutput as MetadataGeneratorOutput,
    Config as MetadataConfig,
    Cache as MetadataCache,

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
