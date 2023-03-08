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
                key: { index: 0 },
                value: { index: 1 },
            },
        }, {
            id: DecoratorID.SWAGGER_TAGS,
            name: 'SwaggerTags',
            properties: {
                value: { amount: -1 },
            },
        },
        {
            id: DecoratorID.RESPONSE_EXAMPLE,
            name: 'ResponseExample',
            properties: {
                type: { isType: true },
                payload: { index: 0 },
            },
        }, {
            id: DecoratorID.RESPONSE_DESCRIPTION,
            name: 'ResponseDescription',
            properties: {
                type: { isType: true },
                statusCode: { index: 0 },
                description: { index: 1 },
                payload: { index: 2 },
            },
        },
        {
            id: DecoratorID.RESPONSE_PRODUCES,
            name: 'ResponseProduces',
            properties: {
                value: {
                    amount: -1, strategy: 'merge',
                },
            },
        },
        {
            id: DecoratorID.REQUEST_CONSUMES,
            name: 'RequestConsumes',
            properties: {
                value: {
                    amount: -1, strategy: 'merge',
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
