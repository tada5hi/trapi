/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID } from '../constants';
import type { DecoratorPropertyValueSchema } from './type';

export type DecoratorRequestConsumesProperties = DecoratorPropertyValueSchema<string[]>;

export type DecoratorRequestSetID = `${DecoratorID.REQUEST_ACCEPT}` |
    `${DecoratorID.REQUEST_CONSUMES}`;

export type DecoratorRequestSetProperties<T extends DecoratorRequestSetID> =
    T extends `${DecoratorID.REQUEST_ACCEPT}` ?
        never :
        T extends `${DecoratorID.REQUEST_CONSUMES}` ?
            DecoratorRequestConsumesProperties :
            never;
