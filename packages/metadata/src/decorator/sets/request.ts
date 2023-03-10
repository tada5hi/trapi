/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID } from '../constants';
import type { DecoratorPropertyValueSchema } from './type';

export type DecoratorRequestConsumesProperties = DecoratorPropertyValueSchema<string[]>;

export type DecoratorRequestSetID = `${DecoratorID.ACCEPT}` |
    `${DecoratorID.CONSUMES}`;

export type DecoratorRequestSetProperties<T extends DecoratorRequestSetID> =
    T extends `${DecoratorID.ACCEPT}` ?
        never :
        T extends `${DecoratorID.CONSUMES}` ?
            DecoratorRequestConsumesProperties :
            never;
