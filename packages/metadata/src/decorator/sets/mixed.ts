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

export type DecoratorSecurityProperties = {
    key: string | Record<string, string[]>,
    value?: unknown[]
};

export type DecoratorMixedSetID = `${DecoratorID.DEPRECATED}` |
    `${DecoratorID.HIDDEN}` |
    `${DecoratorID.EXTENSION}` |
    `${DecoratorID.SECURITY}`;

export type DecoratorMixedSetProperties<T extends DecoratorMixedSetID> =
        T extends `${DecoratorID.EXTENSION}` ?
            DecoratorExtensionProperties :
            T extends `${DecoratorID.SECURITY}` ?
                DecoratorSecurityProperties :
                never;
