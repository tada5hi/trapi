/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecoratorID } from '@trapi/metadata';
import type { DecoratorConfig } from '@trapi/metadata';

export function buildHiddenConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.HIDDEN,
        name: name || 'Hidden',
    };
}
