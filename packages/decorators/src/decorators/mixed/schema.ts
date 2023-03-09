/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecoratorID } from '@trapi/metadata';
import type { DecoratorConfig } from '@trapi/metadata';

export function buildMixedSchema() : DecoratorConfig[] {
    return [
        {
            id: DecoratorID.DEPRECATED,
            name: 'Deprecated',
        },
        {
            id: DecoratorID.EXTENSION,
            name: 'Extension',
            properties: {
                key: { index: 0 },
                value: { index: 1 },
            },
        },
        {
            id: DecoratorID.HIDDEN,
            name: 'Hidden',
        },

        {
            id: DecoratorID.SECURITY,
            name: 'Security',
            properties: {
                key: { index: 1 },
                value: { index: 0 },
            },
        },
        {
            id: DecoratorID.SWAGGER_TAGS,
            name: 'Tags',
            properties: {
                value: { amount: -1, strategy: 'merge' },
            },
        },
    ];
}
