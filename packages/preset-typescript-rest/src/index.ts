/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PresetSchema } from '@trapi/metadata';
import { AnnotationKey } from '@trapi/metadata';

export default {
    extends: ['@trapi/preset-built-in'],
    items: [
        {
            key: AnnotationKey.CLASS_PATH,
            id: 'Path',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.RESPONSE_DESCRIPTION,
            id: 'Description',
            properties: {
                type: { isType: true, srcArgumentType: 'typeArgument' },
                payload: {},
            },
        },
        {
            key: AnnotationKey.RESPONSE_EXAMPLE,
            id: 'Example',
            properties: {
                type: { isType: true, srcArgumentType: 'typeArgument' },
                payload: {},
            },
        },

        {
            key: AnnotationKey.METHOD_PATH,
            id: 'Path',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.METHOD_ALL,
            id: 'ALL',
        },
        {
            key: AnnotationKey.METHOD_DELETE,
            id: 'DELETE',
        },
        {
            key: AnnotationKey.METHOD_GET,
            id: 'GET',
        },
        {
            key: AnnotationKey.METHOD_HEAD,
            id: 'HEAD',
        },
        {
            key: AnnotationKey.METHOD_OPTIONS,
            id: 'OPTIONS',
        },
        {
            key: AnnotationKey.METHOD_PATCH,
            id: 'PATCH',
        },
        {
            key: AnnotationKey.METHOD_POST,
            id: 'POST',
        },
        {
            key: AnnotationKey.METHOD_PUT,
            id: 'PUT',
        },

        {
            key: AnnotationKey.SERVER_CONTEXT,
            id: 'ContextRequest',
        },
        {
            key: AnnotationKey.SERVER_CONTEXT,
            id: 'ContextResponse',
        },
        {
            key: AnnotationKey.SERVER_CONTEXT,
            id: 'ContextNext',
        },
        {
            key: AnnotationKey.SERVER_CONTEXT,
            id: 'ContextLanguage',
        },
        {
            key: AnnotationKey.SERVER_CONTEXT,
            id: 'ContextAccept',
        },

        {
            key: AnnotationKey.SERVER_QUERY,
            id: 'QueryParam',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.SERVER_HEADERS,
            id: 'HeaderParam',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.SERVER_COOKIES,
            id: 'CookieParam',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.SERVER_PARAMS,
            id: 'Param',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.SERVER_PATH_PARAMS,
            id: 'PathParam',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.SERVER_FILE_PARAM,
            id: 'FileParam',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.SERVER_FILES_PARAM,
            id: 'FilesParam',
            properties: {
                value: {},
            },
        },
    ],
} satisfies PresetSchema;
