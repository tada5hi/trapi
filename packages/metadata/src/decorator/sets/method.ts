/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID } from '../constants';
import type { DecoratorPropertyValueSchema } from './type';

export type DecoratorMethodPathProperties = DecoratorPropertyValueSchema<string | undefined>;
export type DecoratorAllProperties = DecoratorPropertyValueSchema<string | undefined>;
export type DecoratorDeleteProperties = DecoratorPropertyValueSchema<string | undefined>;
export type DecoratorHeadProperties = DecoratorPropertyValueSchema<string | undefined>;
export type DecoratorOptionsProperties = DecoratorPropertyValueSchema<string | undefined>;
export type DecoratorGetProperties = DecoratorPropertyValueSchema<string | undefined>;
export type DecoratorPostProperties = DecoratorPropertyValueSchema<string | undefined>;
export type DecoratorPutProperties = DecoratorPropertyValueSchema<string | undefined>;
export type DecoratorPatchProperties = DecoratorPropertyValueSchema<string | undefined>;

export type DecoratorMethodSetID = `${DecoratorID.ALL}` |
    `${DecoratorID.DELETE}` |
    `${DecoratorID.HEAD}` |
    `${DecoratorID.PATCH}` |
    `${DecoratorID.METHOD_PATH}` |
    `${DecoratorID.POST}` |
    `${DecoratorID.PUT}` |
    `${DecoratorID.OPTIONS}`;

export type DecoratorMethodSetProperties<T extends DecoratorMethodSetID> =
    T extends `${DecoratorID.ALL}` ?
        DecoratorAllProperties :
        T extends `${DecoratorID.DELETE}` ?
            DecoratorDeleteProperties :
            T extends `${DecoratorID.GET}` ?
                DecoratorGetProperties :
                T extends `${DecoratorID.HEAD}` ?
                    DecoratorHeadProperties :
                    T extends `${DecoratorID.OPTIONS}` ?
                        DecoratorOptionsProperties :
                        T extends `${DecoratorID.PATCH}` ?
                            DecoratorPatchProperties :
                            T extends `${DecoratorID.METHOD_PATH}` ?
                                DecoratorMethodPathProperties :
                                T extends `${DecoratorID.POST}` ?
                                    DecoratorPostProperties :
                                    T extends `${DecoratorID.PUT}` ?
                                        DecoratorPutProperties :
                                        never;
