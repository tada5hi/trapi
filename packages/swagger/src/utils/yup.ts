/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Lazy from 'yup/lib/Lazy';
import Reference from 'yup/lib/Reference';
import { AnySchema } from 'yup/lib/schema';

export function mapYupRuleToDictionary<T>(map: any, rule: T) : Record<string, AnySchema | Reference | Lazy<any, any> | T> {
    if (!map) {
        return {};
    }

    return Object.keys(map).reduce((newMap, key) => ({
        ...newMap,
        [key]: rule,
    }), {});
}
