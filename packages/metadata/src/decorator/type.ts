/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// -------------------------------------------

import type { DecoratorID } from './constants';
import type {
    DecoratorClassSetID,
    DecoratorClassSetProperties,
    DecoratorMethodSetID,
    DecoratorMethodSetProperties,
    DecoratorMixedSetID,
    DecoratorMixedSetProperties,
    DecoratorParameterSetID,
    DecoratorParameterSetProperties,
    DecoratorRequestSetID,
    DecoratorRequestSetProperties,
    DecoratorResponseSetID,
    DecoratorResponseSetProperties,
} from './sets';

export type DecoratorProperties<T extends `${DecoratorID}`> =
    T extends DecoratorClassSetID ?
        DecoratorClassSetProperties<T> :
        T extends DecoratorMethodSetID ?
            DecoratorMethodSetProperties<T> :
            T extends DecoratorMixedSetID ?
                DecoratorMixedSetProperties<T> :
                T extends DecoratorParameterSetID ?
                    DecoratorParameterSetProperties<T> :
                    T extends DecoratorRequestSetID ?
                        DecoratorRequestSetProperties<T> :
                        T extends DecoratorResponseSetID ?
                            DecoratorResponseSetProperties<T> :
                            never;

export type DecoratorPropertyStrategy = 'merge' | 'none' | ((...items: unknown[] | unknown[][]) => unknown | unknown[]);

export type DecoratorPropertyConfig = {
    /**
     * Default: 'element'
     */
    type?: 'element' | 'array',

    /**
     * Default: false
     */
    isType?: boolean,

    /**
     * Default: 'argument'
     */
    srcArgumentType?: 'argument' | 'typeArgument',

    /**
     * Default: 0
     */
    srcPosition?: number,

    /**
     * Default: undefined
     */
    srcAmount?: number,

    /**
     * Default: 'none'
     */
    srcStrategy?: DecoratorPropertyStrategy
};

export type DecoratorPropertiesConfig<P extends Record<string, any>> = {
    [K in keyof P]: DecoratorPropertyConfig
};

// -------------------------------------------

export type DecoratorConfig<T extends `${DecoratorID}` = `${DecoratorID}`> = {
    id: T,
    name: string,
    properties?: DecoratorPropertiesConfig<DecoratorProperties<T>>
};
