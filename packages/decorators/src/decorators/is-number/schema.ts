/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecoratorID } from '@trapi/metadata';
import type { DecoratorConfig } from '@trapi/metadata';
import { IsLong } from './module';

export function buildIsDoubleConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.IS_DOUBLE,
        name: name || 'IsDouble',
    };
}

export function buildIsFloatConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.IS_FLOAT,
        name: name || 'IsFloat',
    };
}

export function buildIsIntConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.IS_INT,
        name: name || 'IsInt',
    };
}

export function buildIsLongConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.IS_LONG,
        name: name || 'IsLong',
    };
}
