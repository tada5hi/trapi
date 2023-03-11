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
            id: DecoratorID.CONTROLLER,
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
            id: DecoratorID.MOUNT,
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
            id: DecoratorID.MOUNT,
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
            id: DecoratorID.MOUNT,
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
            id: DecoratorID.MOUNT,
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
            id: DecoratorID.MOUNT,
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
            id: DecoratorID.MOUNT,
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
            id: DecoratorID.MOUNT,
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
            id: DecoratorID.MOUNT,
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
