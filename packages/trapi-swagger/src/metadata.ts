/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    generateMetadata,
    createMetadataGenerator,
    GeneratorOutput as MetadataGeneratorOutput,
    Config as MetadataConfig,
    Cache as MetadataCache
} from "@trapi/metadata";

type MetadataCacheConfig = MetadataCache.Config;

export {
    generateMetadata,
    createMetadataGenerator,
    MetadataGeneratorOutput,
    MetadataCacheConfig,
    MetadataConfig
}
