/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    buildConsumesConfig,
    buildDeprecatedConfig,
    buildDescriptionConfig,
    buildExampleConfig,
    buildExtensionConfig,
    buildHiddenConfig,
    buildIsDoubleConfig,
    buildIsFloatConfig,
    buildIsIntConfig,
    buildIsLongConfig, buildSecurityConfig,
    buildTagsConfig,
} from '@trapi/decorators';
import type { PresetSchema } from '@trapi/metadata';
import { DecoratorID } from '@trapi/metadata';

export default {
    extends: ['@trapi/decorators'],
    items: [
        buildConsumesConfig('DConsumes'),
        buildDescriptionConfig('DDescription'),
        buildDeprecatedConfig('DDeprecated'),
        buildExtensionConfig('DExtension'),
        buildExampleConfig('DExample'),
        buildHiddenConfig('DHidden'),
        buildIsDoubleConfig('DIsDouble'),
        buildIsIntConfig('DIsInt'),
        buildIsFloatConfig('DIsFloat'),
        buildIsLongConfig('DIsLong'),
        buildSecurityConfig('DSecurity'),
        buildTagsConfig('DTags'),
        {
            id: DecoratorID.CONTROLLER,
            name: 'DController',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.ALL,
            name: 'DAll',
            properties: {},
        },
        {
            id: DecoratorID.MOUNT,
            name: 'DAll',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.DELETE,
            name: 'DDelete',
            properties: {},
        },
        {
            id: DecoratorID.MOUNT,
            name: 'DDelete',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.HEAD,
            name: 'DHead',
            properties: {},
        },
        {
            id: DecoratorID.MOUNT,
            name: 'DHead',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.OPTIONS,
            name: 'DOptions',
            properties: {},
        },
        {
            id: DecoratorID.MOUNT,
            name: 'DOptions',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.PATCH,
            name: 'DPatch',
            properties: {},
        },
        {
            id: DecoratorID.MOUNT,
            name: 'DPatch',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.POST,
            name: 'DPost',
            properties: {},
        },
        {
            id: DecoratorID.MOUNT,
            name: 'DPost',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.PUT,
            name: 'DPut',
            properties: {},
        },
        {
            id: DecoratorID.MOUNT,
            name: 'DPut',
            properties: {
                value: {},
            },
        },

        {
            id: DecoratorID.CONTEXT,
            name: 'DRequest',
            properties: {},
        },
        {
            id: DecoratorID.CONTEXT,
            name: 'DResponse',
            properties: {},
        },
        {
            id: DecoratorID.CONTEXT,
            name: 'DNext',
            properties: {},
        },

        {
            id: DecoratorID.QUERY,
            name: 'DQuery',
            properties: {},
        },
        {
            id: DecoratorID.BODY,
            name: 'DBody',
            properties: {},
        },
        {
            id: DecoratorID.HEADER,
            name: 'DHeader',
            properties: {},
        },
        {
            id: DecoratorID.HEADERS,
            name: 'DHeaders',
            properties: {},
        },
        {
            id: DecoratorID.COOKIE,
            name: 'DCookie',
            properties: {},
        },
        {
            id: DecoratorID.COOKIES,
            name: 'DCookies',
            properties: {},
        },
        {
            id: DecoratorID.PATH,
            name: 'DPath',
            properties: {},
        },
        {
            id: DecoratorID.PATHS,
            name: 'DPaths',
            properties: {},
        },
    ],
} satisfies PresetSchema;
