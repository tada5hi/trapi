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
            id: 'DController',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.METHOD_ALL,
            id: 'DAll',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_PATH,
            id: 'DAll',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_DELETE,
            id: 'DDelete',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_PATH,
            id: 'DDelete',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_HEAD,
            id: 'DHead',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_PATH,
            id: 'DHead',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_OPTIONS,
            id: 'DOptions',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_PATH,
            id: 'DOptions',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_PATCH,
            id: 'DPatch',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_PATH,
            id: 'DPatch',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_POST,
            id: 'DPost',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_PATH,
            id: 'DPost',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_PUT,
            id: 'DPut',
            properties: {},
        },
        {
            key: AnnotationKey.METHOD_PATH,
            id: 'DPut',
            properties: {},
        },

        {
            key: AnnotationKey.SERVER_CONTEXT,
            id: 'DRequest',
            properties: {},
        },
        {
            key: AnnotationKey.SERVER_CONTEXT,
            id: 'DResponse',
            properties: {},
        },
        {
            key: AnnotationKey.SERVER_CONTEXT,
            id: 'DNext',
            properties: {},
        },

        {
            key: AnnotationKey.SERVER_QUERY,
            id: 'DQuery',
            properties: {},
        },
        {
            key: AnnotationKey.SERVER_BODY,
            id: 'DBody',
            properties: {},
        },
        {
            key: AnnotationKey.SERVER_HEADER,
            id: 'DHeader',
            properties: {},
        },
        {
            key: AnnotationKey.SERVER_HEADERS,
            id: 'DHeaders',
            properties: {},
        },
        {
            key: AnnotationKey.SERVER_COOKIE,
            id: 'DCookie',
            properties: {},
        },
        {
            key: AnnotationKey.SERVER_COOKIES,
            id: 'DCookies',
            properties: {},
        },
        {
            key: AnnotationKey.SERVER_PATH_PARAM,
            id: 'DParam',
            properties: {},
        },
        {
            key: AnnotationKey.SERVER_PATH_PARAMS,
            id: 'DParams',
            properties: {},
        },
    ],
} satisfies PresetSchema;
