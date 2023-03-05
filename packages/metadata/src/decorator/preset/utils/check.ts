/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'locter';
import type { PresetSchema } from '../type';

export function isPresetSchema(input: unknown) : input is PresetSchema {
    return isObject(input) &&
        hasOwnProperty(input, 'items') &&
        Array.isArray(input.items) &&
        (!hasOwnProperty(input, 'extends') || Array.isArray(input.extends));
}
