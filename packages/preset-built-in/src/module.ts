/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PresetSchema } from '@trapi/metadata';
import { AnnotationKey } from '@trapi/metadata';

export const schema = {
    extends: [],
    items: [
        {
            key: AnnotationKey.EXTENSION,
            id: 'Extension',
            properties: {
                key: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
                value: { type: 'element', srcArgumentType: 'argument', srcPosition: 1 },
            },
        }, {
            key: AnnotationKey.SWAGGER_TAGS,
            id: 'SwaggerTags',
            properties: {
                value: { type: 'array', srcArgumentType: 'argument' },
            },
        },
        {
            key: AnnotationKey.RESPONSE_EXAMPLE,
            id: 'ResponseExample',
            properties: {
                type: { isType: true, srcArgumentType: 'typeArgument' },
                payload: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
            },
        }, {
            key: AnnotationKey.RESPONSE_DESCRIPTION,
            id: 'ResponseDescription',
            properties: {
                type: { isType: true, srcArgumentType: 'typeArgument' },
                statusCode: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
                description: { type: 'element', srcArgumentType: 'argument', srcPosition: 1 },
                payload: { type: 'element', srcArgumentType: 'argument', srcPosition: 2 },
            },
        },
        {
            key: AnnotationKey.RESPONSE_PRODUCES,
            id: 'ResponseProduces',
            properties: {
                value: {
                    type: 'array', srcArgumentType: 'argument', srcAmount: -1, srcStrategy: 'merge',
                },
            },
        },
        {
            key: AnnotationKey.REQUEST_CONSUMES,
            id: 'RequestConsumes',
            properties: {
                value: {
                    type: 'array', srcArgumentType: 'argument', srcAmount: -1, srcStrategy: 'merge',
                },
            },
        },
        {
            key: AnnotationKey.HIDDEN,
            id: 'SwaggerHidden',
        },
        {
            key: AnnotationKey.DEPRECATED,
            id: 'SwaggerDeprecated',
        },
        {
            key: AnnotationKey.IS_INT,
            id: 'IsInt',
        }, {
            key: AnnotationKey.IS_LONG,
            id: 'IsLong',
        }, {
            key: AnnotationKey.IS_FLOAT,
            id: 'IsFloat',
        },
        {
            key: AnnotationKey.IS_DOUBLE,
            id: 'IsDouble',
        },

        {
            key: AnnotationKey.SERVER_FILE_PARAM,
            id: 'RequestFileParam',
            properties: {
                value: {},
            },
        },
        {
            key: AnnotationKey.SERVER_FILES_PARAM,
            id: 'RequestFileParam',
            properties: {
                value: {},
            },
        },
    ],
} satisfies PresetSchema;
