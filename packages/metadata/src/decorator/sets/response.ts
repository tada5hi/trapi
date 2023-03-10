/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID } from '../constants';
import type { DecoratorPropertyValueSchema } from './type';

export type DecoratorResponseDescriptionProperties = {
    type: unknown,
    statusCode: number | string,
    description: string,
    payload: unknown | unknown[]
};

export type DecoratorResponseExampleProperties = {
    type: unknown,
    payload: unknown | unknown[],
    label?: string
};
export type DecoratorResponseProducesProperties = DecoratorPropertyValueSchema<string[]>;

export type DecoratorResponseSetID = `${DecoratorID.DESCRIPTION}` |
    `${DecoratorID.EXAMPLE}` |
    `${DecoratorID.PRODUCES}`;
export type DecoratorResponseSetProperties<T extends DecoratorResponseSetID> =
    T extends `${DecoratorID.DESCRIPTION}` ?
        DecoratorResponseDescriptionProperties :
        T extends `${DecoratorID.EXAMPLE}` ?
            DecoratorResponseExampleProperties :
            T extends `${DecoratorID.PRODUCES}` ?
                DecoratorResponseProducesProperties :
                never;
