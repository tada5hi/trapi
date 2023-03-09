/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID } from '../constants';
import type { DecoratorPropertyValueSchema } from './type';

export type DecoratorSwaggerTagsProperties = DecoratorPropertyValueSchema<string[]>;
export type DecoratorClassPathProperties = DecoratorPropertyValueSchema<string>;

export type DecoratorClassSetID = `${DecoratorID.SWAGGER_TAGS}` | `${DecoratorID.CLASS_PATH}`;
export type DecoratorClassSetProperties<T extends DecoratorClassSetID> =
    T extends `${DecoratorID.SWAGGER_TAGS}` ?
        DecoratorSwaggerTagsProperties :
        T extends `${DecoratorID.CLASS_PATH}` ?
            DecoratorClassPathProperties :
            never;