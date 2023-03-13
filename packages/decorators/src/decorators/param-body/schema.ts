/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorConfig } from '@trapi/metadata';
import { DecoratorID } from '@trapi/metadata';

export function buildBodyConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.BODY,
        name: name || 'Body',
        properties: {
            value: {},
        },
    };
}
