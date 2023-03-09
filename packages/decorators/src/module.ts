/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PresetSchema } from '@trapi/metadata';
import {
    buildClassSchema,
    buildMethodSchema,
    buildMixedSchema,
    buildParameterSchema,
    buildPropertySchema,
    buildRequestSchema,
    buildResponseSchema,
} from './decorators';

export const schema = {
    extends: [],
    items: [
        ...buildClassSchema(),
        ...buildMethodSchema(),
        ...buildMixedSchema(),
        ...buildParameterSchema(),
        ...buildPropertySchema(),
        ...buildRequestSchema(),
        ...buildResponseSchema(),
    ],
} satisfies PresetSchema;
