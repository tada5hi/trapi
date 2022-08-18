/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { RepresentationMap } from '../../types';

export default {
    // Class
    CLASS_PATH: {
        id: 'Controller',
        properties: {
            DEFAULT: {},
        },
    },

    // Method
    METHOD_PATH: [
        {
            id: 'All',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'Get',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'Post',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'Put',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'Delete',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'Patch',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'Options',
            properties: {
                DEFAULT: {},
            },
        },
        {
            id: 'Head',
            properties: {
                DEFAULT: {},
            },
        },
    ],

    // Parameter
    SERVER_CONTEXT: [
        {
            id: 'Request',
            properties: {},
        },
        {
            id: 'Response',
            properties: {},
        },
        {
            id: 'Next',
            properties: {},
        },
    ],
    SERVER_QUERY: {
        id: 'Query',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_FORM: undefined,
    SERVER_BODY: {
        id: 'Body',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_HEADERS: {
        id: 'Headers',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_COOKIES: {
        id: 'Cookies',
        properties: {
            DEFAULT: {},
        },
    },
    SERVER_PATH_PARAMS: {
        id: 'Params',
        properties: {
            DEFAULT: {},
        },
    },
} as Partial<RepresentationMap>;
