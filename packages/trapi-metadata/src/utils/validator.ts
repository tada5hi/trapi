/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    SchemaOf, array, boolean, lazy, mixed, object, string,
} from 'yup';
import { Config } from '../type';
import { useDecoratorConfigValidator } from '../decorator/utils/validator';

let validatorInstance : undefined | SchemaOf<Config>;

export function useConfigValidator() : SchemaOf<Config> {
    if (typeof validatorInstance !== 'undefined') {
        return validatorInstance;
    }

    validatorInstance = object({
        entryFile: lazy((value) => {
            if (typeof value === 'string') {
                return string().required();
            }

            return array().of(string()).required().min(1);
        }),
        cache: lazy((value) => {
            if (typeof value === 'string') {
                return string();
            }

            if (typeof value === 'boolean') {
                return boolean();
            }

            return mixed().optional().default(undefined);
        }),
        ignore: array(string()).optional().default(undefined),
        decorator: useDecoratorConfigValidator(),
    }) as unknown as SchemaOf<Config>;

    return validatorInstance;
}
