/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { MapperIDRepresentation } from '../types';

export default {
    // Class
    CLASS_PATH: {
        id: 'DController',
        properties: {
            DEFAULT: {},
        },
    },

    // Method
    METHOD_PATH: [
        {
            id: 'DAll',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'DGet',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'DPost',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'DPut',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'DDelete',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'DPatch',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'DOptions',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'DHead',
            properties: {
                DEFAULT: {},
            },
        },
    ],

    // Parameter
    SERVER_CONTEXT: [
        {
            id: 'DRequest',
            properties: {},
        },
        {
            id: 'DResponse',
            properties: {},
        },
        {
            id: 'DNext',
            properties: {},
        },
    ],
    SERVER_QUERY: {
        id: 'DQuery',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_FORM: undefined,
    SERVER_BODY: {
        id: 'DBody',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_HEADER: {
        id: 'DHeader',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_HEADERS: {
        id: 'DHeaders',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_COOKIE: {
        id: 'DCookie',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_COOKIES: {
        id: 'DCookies',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_PATH_PARAM: {
        id: 'DParam',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_PATH_PARAMS: {
        id: 'DParams',
        properties: {
            DEFAULT: {},
        },
    },
} as Partial<MapperIDRepresentation>;
