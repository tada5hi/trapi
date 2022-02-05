/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Decorator } from '../../type';

export default {
    EXTENSION: {
        id: 'Extension',
        properties: {
            KEY: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
            VALUE: { type: 'element', srcArgumentType: 'argument', srcPosition: 1 },
        },
    },

    // Class
    SWAGGER_TAGS: {
        id: 'SwaggerTags',
        properties: {
            DEFAULT: { type: 'array', srcArgumentType: 'argument' },
        },
    },

    // Class + Method
    RESPONSE_EXAMPLE: {
        id: 'ResponseExample',
        properties: {
            TYPE: { isType: true, srcArgumentType: 'typeArgument' },
            PAYLOAD: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
        },
    },
    RESPONSE_DESCRIPTION: {
        id: 'ResponseDescription',
        properties: {
            TYPE: { isType: true, srcArgumentType: 'typeArgument' },
            STATUS_CODE: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
            DESCRIPTION: { type: 'element', srcArgumentType: 'argument', srcPosition: 1 },
            PAYLOAD: { type: 'element', srcArgumentType: 'argument', srcPosition: 2 },
        },
    },
    REQUEST_CONSUMES: {
        id: 'RequestConsumes',
        properties: {
            DEFAULT: {
                type: 'array', srcArgumentType: 'argument', srcAmount: -1, srcStrategy: 'merge',
            },
        },
    },
    RESPONSE_PRODUCES: {
        id: 'ResponseProduces',
        properties: {
            DEFAULT: {
                type: 'array', srcArgumentType: 'argument', srcAmount: -1, srcStrategy: 'merge',
            },
        },
    },

    HIDDEN: {
        id: 'SwaggerHidden',
        properties: [],
    },
    DEPRECATED: {
        id: 'SwaggerDeprecated',
        properties: undefined,
    },

    IS_INT: {
        id: 'IsInt',
        properties: undefined,
    },
    IS_LONG: {
        id: 'IsLong',
        properties: undefined,
    },
    IS_FlOAT: {
        id: 'IsFloat',
        properties: undefined,
    },
    IS_DOUBLE: {
        id: 'IsDouble',
        properties: undefined,
    },

    SERVER_FILES_PARAM: {
        id: 'RequestFileParam',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_FILE_PARAM: {
        id: 'RequestFileParam',
        properties: {
            DEFAULT: {},
        },
    },
} as Partial<Decorator.TypeRepresentationMap>;
