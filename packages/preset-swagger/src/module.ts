/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PresetSchema } from '@trapi/metadata';
import { DecoratorID } from '@trapi/metadata';

export const schema = {
    extends: [],
    items: [
        {
            id: DecoratorID.EXTENSION,
            name: 'Extension',
            properties: {
                key: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
                value: { type: 'element', srcArgumentType: 'argument', srcPosition: 1 },
            },
        }, {
            id: DecoratorID.SWAGGER_TAGS,
            name: 'SwaggerTags',
            properties: {
                value: { type: 'array', srcArgumentType: 'argument' },
            },
        },
        {
            id: DecoratorID.RESPONSE_EXAMPLE,
            name: 'ResponseExample',
            properties: {
                type: { isType: true, srcArgumentType: 'typeArgument' },
                payload: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
            },
        }, {
            id: DecoratorID.RESPONSE_DESCRIPTION,
            name: 'ResponseDescription',
            properties: {
                type: { isType: true, srcArgumentType: 'typeArgument' },
                statusCode: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
                description: { type: 'element', srcArgumentType: 'argument', srcPosition: 1 },
                payload: { type: 'element', srcArgumentType: 'argument', srcPosition: 2 },
            },
        },
        {
            id: DecoratorID.RESPONSE_PRODUCES,
            name: 'ResponseProduces',
            properties: {
                value: {
                    type: 'array', srcArgumentType: 'argument', srcAmount: -1, srcStrategy: 'merge',
                },
            },
        },
        {
            id: DecoratorID.REQUEST_CONSUMES,
            name: 'RequestConsumes',
            properties: {
                value: {
                    type: 'array', srcArgumentType: 'argument', srcAmount: -1, srcStrategy: 'merge',
                },
            },
        },
        {
            id: DecoratorID.HIDDEN,
            name: 'SwaggerHidden',
        },
        {
            id: DecoratorID.DEPRECATED,
            name: 'SwaggerDeprecated',
        },
        {
            id: DecoratorID.IS_INT,
            name: 'IsInt',
        }, {
            id: DecoratorID.IS_LONG,
            name: 'IsLong',
        }, {
            id: DecoratorID.IS_FLOAT,
            name: 'IsFloat',
        },
        {
            id: DecoratorID.IS_DOUBLE,
            name: 'IsDouble',
        },

        {
            id: DecoratorID.FILE_PARAM,
            name: 'RequestFileParam',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.FILES_PARAM,
            name: 'RequestFileParam',
            properties: {
                value: {},
            },
        },
    ],
} satisfies PresetSchema;
