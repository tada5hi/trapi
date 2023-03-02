/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MapperIDRepresentation } from '../types';

export default {
    // Class
    CLASS_PATH: {
        id: 'Path',
        properties: {
            DEFAULT: { type: 'element', srcArgumentType: 'argument' },
        },
    },

    // Class + Method
    REQUEST_ACCEPT: undefined,
    RESPONSE_EXAMPLE: {
        id: 'Example',
        properties: {
            TYPE: { isType: true, srcArgumentType: 'typeArgument' },
            PAYLOAD: { type: 'element', srcArgumentType: 'argument' },
        },
    },
    RESPONSE_DESCRIPTION: {
        id: 'Response',
        properties: {
            TYPE: { type: 'element', srcArgumentType: 'typeArgument' },
            STATUS_CODE: { type: 'element', srcArgumentType: 'argument', srcPosition: 0 },
            DESCRIPTION: { type: 'element', srcArgumentType: 'argument', srcPosition: 1 },
            PAYLOAD: { type: 'element', srcArgumentType: 'argument', srcPosition: 2 },
        },
    },

    // Method
    ALL: {
        id: 'ALL',
        properties: {},
    },
    GET: {
        id: 'GET',
        properties: {},
    },
    POST: {
        id: 'POST',
        properties: {},
    },
    PUT: {
        id: 'PUT',
        properties: {},
    },
    DELETE: {
        id: 'DELETE',
        properties: {},
    },
    PATCH: {
        id: 'PATCH',
        properties: {},
    },
    OPTIONS: {
        id: 'OPTIONS',
        properties: {},
    },
    HEAD: {
        id: 'HEAD',
        properties: {},
    },

    METHOD_PATH: {
        id: 'Path',
        properties: {
            DEFAULT: { type: 'element', srcArgumentType: 'argument' },
        },
    },

    // Parameter
    SERVER_CONTEXT: [
        {
            id: 'Context',
        },
        {
            id: 'ContextRequest',
        },
        {
            id: 'ContextResponse',
        },
        {
            id: 'ContextNext',
        },
        {
            id: 'ContextLanguage',
        },
        {
            id: 'ContextAccept',
        },
    ],
    SERVER_PARAMS: {
        id: 'Param',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_QUERY: {
        id: 'QueryParam',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_FORM: {
        id: 'FormParam',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_BODY: undefined,
    SERVER_HEADERS: {
        id: 'HeaderParam',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_COOKIES: {
        id: 'CookieParam',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_PATH_PARAMS: {
        id: 'PathParam',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_FILES_PARAM: {
        id: 'FilesParam',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_FILE_PARAM: {
        id: 'FileParam',
        properties: {
            DEFAULT: {},
        },
    },
} as Partial<MapperIDRepresentation>;
