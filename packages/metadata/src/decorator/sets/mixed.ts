/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID } from '../constants';

export type DecoratorExtensionProperties = {
    key: string,
    value: unknown | unknown[]
};
export type DecoratorMixedSetID = `${DecoratorID.DEPRECATED}` |
    `${DecoratorID.HIDDEN}` |
    `${DecoratorID.EXTENSION}`;

export type DecoratorMixedSetProperties<T extends DecoratorMixedSetID> =
        T extends `${DecoratorID.EXTENSION}` ?
            DecoratorExtensionProperties :
            never;
