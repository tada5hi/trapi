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
            name: 'Path',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.DESCRIPTION,
            name: 'Description',
            properties: {
                type: { isType: true },
                payload: { index: 2 },
                statusCode: { index: 0 },
                description: { index: 1 },
            },
        },
        {
            id: DecoratorID.EXAMPLE,
            name: 'Example',
            properties: {
                type: { isType: true },
                payload: {},
            },
        },

        {
            id: DecoratorID.MOUNT,
            name: 'Path',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.ALL,
            name: 'ALL',
        },
        {
            id: DecoratorID.DELETE,
            name: 'DELETE',
        },
        {
            id: DecoratorID.GET,
            name: 'GET',
        },
        {
            id: DecoratorID.HEAD,
            name: 'HEAD',
        },
        {
            id: DecoratorID.OPTIONS,
            name: 'OPTIONS',
        },
        {
            id: DecoratorID.PATCH,
            name: 'PATCH',
        },
        {
            id: DecoratorID.POST,
            name: 'POST',
        },
        {
            id: DecoratorID.PUT,
            name: 'PUT',
        },

        {
            id: DecoratorID.CONTEXT,
            name: 'ContextRequest',
        },
        {
            id: DecoratorID.CONTEXT,
            name: 'ContextResponse',
        },
        {
            id: DecoratorID.CONTEXT,
            name: 'ContextNext',
        },
        {
            id: DecoratorID.CONTEXT,
            name: 'ContextLanguage',
        },
        {
            id: DecoratorID.CONTEXT,
            name: 'ContextAccept',
        },

        {
            id: DecoratorID.QUERY,
            name: 'QueryParam',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.HEADERS,
            name: 'HeaderParam',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.COOKIES,
            name: 'CookieParam',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.PARAMS,
            name: 'Param',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.PATH_PARAMS,
            name: 'PathParam',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.FILE_PARAM,
            name: 'FileParam',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.FILES_PARAM,
            name: 'FilesParam',
            properties: {
                value: {},
            },
        },
    ],
} satisfies PresetSchema;
