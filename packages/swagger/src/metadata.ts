/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DecoratorConfig,
    DecoratorID,
    Metadata,
    Options as MetadataOptions,
    PresetSchema,
    TsCompilerOptions,
    TsConfig,
    generateMetadata,
    isMetadata,
} from '@trapi/metadata';

import type { CacheOptions } from '@trapi/metadata';

export {
    DecoratorConfig,
    DecoratorID,

    // Utils
    generateMetadata,
    isMetadata,

    CacheOptions,

    // Types & Interfaces
    Metadata,
    MetadataOptions,

    PresetSchema,

    TsCompilerOptions,
    TsConfig,
};
