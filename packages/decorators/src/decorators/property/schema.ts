/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecoratorID } from '@trapi/metadata';
import type { DecoratorConfig } from '@trapi/metadata';

export function buildPropertySchema() : DecoratorConfig[] {
    return [
        {
            id: DecoratorID.IS_DOUBLE,
            name: 'IsDouble',
        },
        {
            id: DecoratorID.IS_FLOAT,
            name: 'IsFloat',
        },
        {
            id: DecoratorID.IS_INT,
            name: 'IsInt',
        },
        {
            id: DecoratorID.IS_LONG,
            name: 'IsLong',
        },
    ];
}
