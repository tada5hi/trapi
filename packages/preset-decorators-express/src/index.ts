/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PresetSchema } from '@trapi/metadata';
import { DecoratorID } from '@trapi/metadata';

export default {
    extends: ['@trapi/preset-swagger'],
    items: [
        {
            id: DecoratorID.CLASS_PATH,
            name: 'Controller',
            properties: {
                value: {},
            },
        },

        {
            id: DecoratorID.ALL,
            name: 'All',
        },
        {
            id: DecoratorID.METHOD_PATH,
            name: 'All',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.DELETE,
            name: 'Delete',
        },
        {
            id: DecoratorID.METHOD_PATH,
            name: 'Delete',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.GET,
            name: 'Get',
        },
        {
            id: DecoratorID.METHOD_PATH,
            name: 'Get',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.HEAD,
            name: 'Head',
        },
        {
            id: DecoratorID.METHOD_PATH,
            name: 'Head',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.OPTIONS,
            name: 'Options',
        },
        {
            id: DecoratorID.METHOD_PATH,
            name: 'Options',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.PATCH,
            name: 'Patch',
        },
        {
            id: DecoratorID.METHOD_PATH,
            name: 'Patch',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.POST,
            name: 'Post',
        },
        {
            id: DecoratorID.METHOD_PATH,
            name: 'Post',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.PUT,
            name: 'Put',
        },
        {
            id: DecoratorID.METHOD_PATH,
            name: 'Put',
            properties: {
                value: {},
            },
        },

        {
            id: DecoratorID.CONTEXT,
            name: 'Request',
        },
        {
            id: DecoratorID.CONTEXT,
            name: 'Response',
        },
        {
            id: DecoratorID.CONTEXT,
            name: 'Next',
        },

        {
            id: DecoratorID.QUERY,
            name: 'Query',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.HEADERS,
            name: 'Headers',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.COOKIES,
            name: 'Cookies',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.PATH_PARAMS,
            name: 'Params',
            properties: {
                value: {},
            },
        },
    ],
} satisfies PresetSchema;
