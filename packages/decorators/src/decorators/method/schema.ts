/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecoratorID } from '@trapi/metadata';
import type { DecoratorConfig } from '@trapi/metadata';

export function buildMethodSchema() : DecoratorConfig[] {
    return [
        {
            id: DecoratorID.METHOD_PATH,
            name: 'Method',
            properties: {
                value: {},
            },
        },
        {
            id: DecoratorID.ALL,
            name: 'All',
        },
        {
            id: DecoratorID.DELETE,
            name: 'Delete',
        },
        {
            id: DecoratorID.GET,
            name: 'Get',
        },
        {
            id: DecoratorID.HEAD,
            name: 'Head',
        },
        {
            id: DecoratorID.OPTIONS,
            name: 'Options',
        },
        {
            id: DecoratorID.PATCH,
            name: 'Patch',
        },
        {
            id: DecoratorID.POST,
            name: 'Post',
        },
        {
            id: DecoratorID.PUT,
            name: 'Put',
        },
    ];
}
