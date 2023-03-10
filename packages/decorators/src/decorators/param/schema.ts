/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorConfig } from '@trapi/metadata';
import { DecoratorID } from '@trapi/metadata';

export function buildParamConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.PARAM,
        name: name || 'Param',
        properties: {
            value: {},
        },
    };
}
export function buildParamsSchema(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.PARAMS,
        name: name || 'Params',
        properties: {
            value: {},
        },
    };
}
