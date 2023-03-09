/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorConfig } from '@trapi/metadata';
import { DecoratorID } from '@trapi/metadata';

export function buildParameterSchema() : DecoratorConfig[] {
    return [
        {
            id: DecoratorID.PATH_PARAMS,
            name: 'PathParam',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.PATH_PARAMS,
            name: 'PathParams',
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
        {
            id: DecoratorID.QUERY,
            name: 'Query',
            properties: {
                value: {},
            },
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
            id: DecoratorID.FORM,
            name: 'FormParam',
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
    ];
}
