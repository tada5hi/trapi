/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecoratorID } from '@trapi/metadata';
import type { DecoratorConfig } from '@trapi/metadata';

export function buildHeaderConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.HEADER,
        name: name || 'HeaderParam',
        properties: {
            value: {},
        },
    };
}
export function buildHeadersConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.HEADERS,
        name: name || 'Headers',
        properties: {
            value: {},
        },
    };
}
