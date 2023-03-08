/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'locter';
import type { Metadata } from './type';

export function isMetadata(input: unknown) : input is Metadata {
    return isObject(input) &&
        hasOwnProperty(input, 'controllers') &&
        Array.isArray(input.controllers) &&
        hasOwnProperty(input, 'referenceTypes') &&
        isObject(input.referenceTypes);
}
