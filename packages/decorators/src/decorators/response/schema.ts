/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorConfig } from '@trapi/metadata';
import { DecoratorID } from '@trapi/metadata';

export function buildResponseSchema() : DecoratorConfig[] {
    return [
        {
            id: DecoratorID.RESPONSE_DESCRIPTION,
            name: 'Description',
            properties: {
                type: { isType: true },
                payload: { index: 2 },
                statusCode: { index: 0 },
                description: { index: 1 },
            },
        },
        {
            id: DecoratorID.RESPONSE_EXAMPLE,
            name: 'Example',
            properties: {
                type: { isType: true },
                payload: {},
            },
        },
        {
            id: DecoratorID.RESPONSE_PRODUCES,
            name: 'Produces',
            properties: {
                value: {
                    amount: -1, strategy: 'merge',
                },
            },
        },
    ];
}
